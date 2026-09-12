import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  const prisma = {
    resource: { findUnique: jest.fn() },
    booking: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    blockedTime: { findFirst: jest.fn() },
  };
  const sender = { sendConfirmation: jest.fn() };

  const resource = {
    id: 'res-1',
    name: 'Room A',
    slotDurationMinutes: 60,
  };
  const dto = {
    resourceId: 'res-1',
    startTime: '2026-09-09T13:00:00.000Z',
    guestName: 'Eduardo',
    guestEmail: 'edu@example.com',
  };
  const createdBooking = {
    id: 'bk-1',
    resourceId: 'res-1',
    startTime: new Date('2026-09-09T13:00:00.000Z'),
    endTime: new Date('2026-09-09T14:00:00.000Z'),
    guestName: 'Eduardo',
    guestEmail: 'edu@example.com',
    status: 'CONFIRMED',
  };

  let service: BookingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    sender.sendConfirmation.mockResolvedValue(undefined);
    service = new BookingsService(prisma as never, sender as never);
  });

  it('creates a booking with endTime = startTime + slot duration', async () => {
    prisma.resource.findUnique.mockResolvedValue(resource);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.blockedTime.findFirst.mockResolvedValue(null);
    prisma.booking.create.mockResolvedValue(createdBooking);

    const result = await service.create(dto);

    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resourceId: 'res-1',
        startTime: new Date('2026-09-09T13:00:00.000Z'),
        endTime: new Date('2026-09-09T14:00:00.000Z'),
        guestName: 'Eduardo',
        guestEmail: 'edu@example.com',
      }),
    });
    expect(result).toEqual(createdBooking);
  });

  it('fires the confirmation email asynchronously with booking details', async () => {
    prisma.resource.findUnique.mockResolvedValue(resource);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.blockedTime.findFirst.mockResolvedValue(null);
    prisma.booking.create.mockResolvedValue(createdBooking);
    sender.sendConfirmation.mockResolvedValue(undefined);

    await service.create(dto);

    expect(sender.sendConfirmation).toHaveBeenCalledWith({
      guestName: 'Eduardo',
      guestEmail: 'edu@example.com',
      resourceId: 'res-1',
      startTime: createdBooking.startTime,
      endTime: createdBooking.endTime,
    });
  });

  it('keeps the booking when the confirmation email fails (fire-and-forget)', async () => {
    // The service logs the failed email — silence it to keep test output clean.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    prisma.resource.findUnique.mockResolvedValue(resource);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.blockedTime.findFirst.mockResolvedValue(null);
    prisma.booking.create.mockResolvedValue(createdBooking);
    sender.sendConfirmation.mockRejectedValue(new Error('SMTP down'));

    await expect(service.create(dto)).resolves.toEqual(createdBooking);
    errorSpy.mockRestore();
  });

  it('throws 409 when the slot overlaps a confirmed booking', async () => {
    prisma.resource.findUnique.mockResolvedValue(resource);
    prisma.booking.findFirst.mockResolvedValue({ id: 'bk-other' });
    prisma.blockedTime.findFirst.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws 409 when the slot overlaps a blocked time', async () => {
    prisma.resource.findUnique.mockResolvedValue(resource);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.blockedTime.findFirst.mockResolvedValue({ id: 'bt-1' });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws 409 when the DB unique constraint rejects the create (P2002 race)', async () => {
    prisma.resource.findUnique.mockResolvedValue(resource);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.blockedTime.findFirst.mockResolvedValue(null);
    prisma.booking.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws 404 when the resource does not exist', async () => {
    prisma.resource.findUnique.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
  });
});