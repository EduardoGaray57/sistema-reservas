import { Module, Provider } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PrismaService } from '../prisma.service';
import {
  BOOKING_NOTIFICATION_SENDER,
  BookingNotificationSender,
} from './booking-notification.interface';

/**
 * Default log-only notification sender. PR 5 replaces this provider with the
 * real Resend-backed email service (see booking-notification.interface.ts).
 */
const logOnlyNotificationSender: Provider<BookingNotificationSender> = {
  provide: BOOKING_NOTIFICATION_SENDER,
  useValue: {
    async sendConfirmation({ guestEmail, guestName, resourceId, startTime, endTime }) {
      // eslint-disable-next-line no-console
      console.log(
        `[Notification] Booking confirmation for ${guestName} <${guestEmail}> ` +
          `resource=${resourceId} ${startTime.toISOString()}→${endTime.toISOString()}`,
      );
    },
  } satisfies BookingNotificationSender,
};

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService, logOnlyNotificationSender],
})
export class BookingsModule {}