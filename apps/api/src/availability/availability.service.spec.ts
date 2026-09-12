import { NotFoundException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

describe('AvailabilityService', () => {
  const prisma = {
    resource: { findUnique: jest.fn() },
    booking: { findMany: jest.fn() },
    blockedTime: { findMany: jest.fn() },
  };

  // 2026-09-09 is a Wednesday (dayOfWeek 3); 2026-09-13 is a Sunday (dayOfWeek 0).
  const baseResource = {
    id: 'res-1',
    name: 'Room A',
    slotDurationMinutes: 60,
    timezone: 'America/Argentina/Buenos_Aires',
    schedules: [
      {
        id: 'sched-1',
        resourceId: 'res-1',
        dayOfWeek: 3,
        startTime: '09:00',
        endTime: '12:00',
      },
    ],
  };

  let service: AvailabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Simulate Prisma's schedule filtering by dayOfWeek (the service passes the
    // requested day's dayOfWeek into the include query).
    prisma.resource.findUnique.mockImplementation(
      (args: { include: { schedules: { where: { dayOfWeek: number } } } }) => {
        const dayOfWeek = args.include.schedules.where.dayOfWeek;
        const schedules = baseResource.schedules.filter(
          (s: { dayOfWeek: number }) => s.dayOfWeek === dayOfWeek,
        );
        return Promise.resolve({ ...baseResource, schedules });
      },
    );
    service = new AvailabilityService(prisma as never);
  });

  it('generates one slot per hour for a 09:00–12:00 schedule (Wed 2026-09-09)', async () => {
    prisma.resource.findUnique.mockResolvedValue(baseResource);
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.blockedTime.findMany.mockResolvedValue([]);

    const result = await service.getAvailableSlots('res-1', '2026-09-09');

    // UTC-3: local 09:00 → 12:00Z
    expect(result.resource).toEqual({
      id: 'res-1',
      name: 'Room A',
      slotDurationMinutes: 60,
      timezone: 'America/Argentina/Buenos_Aires',
    });
    expect(result.slots).toHaveLength(3);
    expect(result.slots[0]).toEqual({
      startTime: '2026-09-09T12:00:00.000Z',
      endTime: '2026-09-09T13:00:00.000Z',
      available: true,
    });
    expect(result.slots.every((s) => s.available)).toBe(true);
  });

  it('steps 30-minute slots across an 09:00–17:00 window for a 30-min resource', async () => {
    prisma.resource.findUnique.mockResolvedValue({
      ...baseResource,
      slotDurationMinutes: 30,
      schedules: [
        {
          id: 'sched-2',
          resourceId: 'res-1',
          dayOfWeek: 3,
          startTime: '09:00',
          endTime: '17:00',
        },
      ],
    });
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.blockedTime.findMany.mockResolvedValue([]);

    const result = await service.getAvailableSlots('res-1', '2026-09-09');

    expect(result.slots).toHaveLength(16); // 8 hours × 2
    expect(result.slots[0].startTime).toBe('2026-09-09T12:00:00.000Z');
    expect(result.slots[15].endTime).toBe('2026-09-09T20:00:00.000Z');
  });

  it('marks only the slot overlapped by a booking as unavailable', async () => {
    prisma.resource.findUnique.mockResolvedValue(baseResource);
    prisma.booking.findMany.mockResolvedValue([
      // Local 10:00–11:00 → 13:00Z–14:00Z
      {
        startTime: new Date('2026-09-09T13:00:00.000Z'),
        endTime: new Date('2026-09-09T14:00:00.000Z'),
      },
    ]);
    prisma.blockedTime.findMany.mockResolvedValue([]);

    const result = await service.getAvailableSlots('res-1', '2026-09-09');

    expect(result.slots.map((s) => s.available)).toEqual([true, false, true]);
  });

  it('marks slots overlapped by a blocked time as unavailable', async () => {
    prisma.resource.findUnique.mockResolvedValue(baseResource);
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.blockedTime.findMany.mockResolvedValue([
      // Local 09:00–10:00 → 12:00Z–13:00Z
      {
        startTime: new Date('2026-09-09T12:00:00.000Z'),
        endTime: new Date('2026-09-09T13:00:00.000Z'),
      },
    ]);

    const result = await service.getAvailableSlots('res-1', '2026-09-09');

    expect(result.slots.map((s) => s.available)).toEqual([false, true, true]);
  });

  it('returns empty slots when there is no schedule for the requested day', async () => {
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.blockedTime.findMany.mockResolvedValue([]);

    // Sunday 2026-09-13 — no schedule entry (fixture only has dayOfWeek 3)
    const result = await service.getAvailableSlots('res-1', '2026-09-13');

    expect(result.slots).toEqual([]);
  });

  it('throws NotFoundException when the resource does not exist', async () => {
    prisma.resource.findUnique.mockResolvedValue(null);

    await expect(
      service.getAvailableSlots('missing', '2026-09-09'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});