import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  BOOKING_NOTIFICATION_SENDER,
  BookingNotificationSender,
} from './booking-notification.interface';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BOOKING_NOTIFICATION_SENDER)
    private readonly notificationSender: BookingNotificationSender,
  ) {}

  async create(dto: CreateBookingDto) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: dto.resourceId },
    });
    if (!resource) {
      throw new NotFoundException(`Resource with id "${dto.resourceId}" not found`);
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(startTime.getTime() + resource.slotDurationMinutes * 60_000);

    await this.assertSlotAvailable(dto.resourceId, startTime, endTime);

    let booking;
    try {
      booking = await this.prisma.booking.create({
        data: {
          resourceId: dto.resourceId,
          startTime,
          endTime,
          guestName: dto.guestName,
          guestEmail: dto.guestEmail,
          // status defaults to CONFIRMED
        },
      });
    } catch (error) {
      // P2002 = unique constraint violation on (resourceId, startTime) — race safety net
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This slot is not available — it was just booked');
      }
      throw error;
    }

    // Fire-and-forget: send confirmation email async. A failure must NOT
    // block booking creation — only log it (retry is out of scope for v1).
    this.notificationSender
      .sendConfirmation({
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        resourceId: booking.resourceId,
        startTime: booking.startTime,
        endTime: booking.endTime,
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('[Bookings] Confirmation email failed (booking kept):', err);
      });

    return booking;
  }

  findAll(resourceId: string, date: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    return this.prisma.booking.findMany({
      where: {
        resourceId,
        startTime: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async cancel(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking with id "${id}" not found`);
    }
    if (booking.status === 'CANCELLED') {
      return booking; // idempotent — already cancelled
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * App-level availability check against CONFIRMED bookings and blocked times.
   * The DB unique constraint on (resourceId, startTime) remains the atomic
   * safety net for concurrent requests.
   */
  private async assertSlotAvailable(
    resourceId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    const [overlappingBooking, overlappingBlock] = await Promise.all([
      this.prisma.booking.findFirst({
        where: {
          resourceId,
          status: 'CONFIRMED',
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      }),
      this.prisma.blockedTime.findFirst({
        where: {
          resourceId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      }),
    ]);

    if (overlappingBooking) {
      throw new ConflictException(
        'This slot is not available — it overlaps an existing booking',
      );
    }
    if (overlappingBlock) {
      throw new ConflictException(
        'This slot is not available — it overlaps a blocked time',
      );
    }
  }
}