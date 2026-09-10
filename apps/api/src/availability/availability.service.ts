import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface AvailabilityResponse {
  resource: {
    id: string;
    name: string;
    slotDurationMinutes: number;
    timezone: string;
  };
  date: string;
  slots: AvailabilitySlot[];
}

/**
 * Returns the UTC offset in minutes for a timezone at a given date.
 * Positive value means the timezone is behind UTC (e.g., UTC-3 → 180).
 */
function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const extract = (parts: Intl.DateTimeFormatPart[], type: string): number =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

  const tzParts = tzFormatter.formatToParts(date);
  const utcParts = utcFormatter.formatToParts(date);

  const tzMs = Date.UTC(
    extract(tzParts, 'year'),
    extract(tzParts, 'month') - 1,
    extract(tzParts, 'day'),
    extract(tzParts, 'hour'),
    extract(tzParts, 'minute'),
    extract(tzParts, 'second'),
  );

  const utcMs = Date.UTC(
    extract(utcParts, 'year'),
    extract(utcParts, 'month') - 1,
    extract(utcParts, 'day'),
    extract(utcParts, 'hour'),
    extract(utcParts, 'minute'),
    extract(utcParts, 'second'),
  );

  return (utcMs - tzMs) / 60_000;
}

/**
 * Converts a local date+time (e.g., "2026-09-11" + "09:00") in a timezone
 * to a UTC Date object.
 */
function localTimeToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  // Parse as if UTC (ISO without timezone suffix defaults to Z)
  const naive = new Date(`${dateStr}T${timeStr}:00.000Z`);
  const offsetMin = getTimezoneOffsetMinutes(timezone, naive);
  // UTC time = naive time + offset (offset positive when timezone is west of UTC)
  return new Date(naive.getTime() + offsetMin * 60_000);
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableSlots(resourceId: string, date: string): Promise<AvailabilityResponse> {
    // Parse the day of week from the date string
    const requestedDate = new Date(`${date}T00:00:00Z`);
    const dayOfWeek = requestedDate.getUTCDay();

    // Load resource with the schedule entry for this day of week
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        schedules: { where: { dayOfWeek } },
      },
    });

    if (!resource) {
      throw new NotFoundException(`Resource with id "${resourceId}" not found`);
    }

    // No schedule for this day → empty slots
    if (resource.schedules.length === 0) {
      return {
        resource: {
          id: resource.id,
          name: resource.name,
          slotDurationMinutes: resource.slotDurationMinutes,
          timezone: resource.timezone,
        },
        date,
        slots: [],
      };
    }

    const schedule = resource.schedules[0];
    const durationMs = resource.slotDurationMinutes * 60_000;

    // Convert schedule boundaries from resource-local time to UTC
    const dayStartUTC = localTimeToUTC(date, schedule.startTime, resource.timezone);
    const dayEndUTC = localTimeToUTC(date, schedule.endTime, resource.timezone);

    // Generate candidate slots by stepping through the schedule window
    const slots: AvailabilitySlot[] = [];
    let cursor = dayStartUTC.getTime();
    while (cursor + durationMs <= dayEndUTC.getTime()) {
      slots.push({
        startTime: new Date(cursor).toISOString(),
        endTime: new Date(cursor + durationMs).toISOString(),
        available: true,
      });
      cursor += durationMs;
    }

    // Load existing bookings and blocked times that overlap the day range
    const [bookings, blockedTimes] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          resourceId,
          status: 'CONFIRMED',
          startTime: { lt: dayEndUTC },
          endTime: { gt: dayStartUTC },
        },
      }),
      this.prisma.blockedTime.findMany({
        where: {
          resourceId,
          startTime: { lt: dayEndUTC },
          endTime: { gt: dayStartUTC },
        },
      }),
    ]);

    // Mark slots that overlap a booking or blocked time as unavailable
    for (const slot of slots) {
      const sStart = new Date(slot.startTime).getTime();
      const sEnd = new Date(slot.endTime).getTime();

      const blocked =
        bookings.some((b) => sStart < b.endTime.getTime() && sEnd > b.startTime.getTime()) ||
        blockedTimes.some((bt) => sStart < bt.endTime.getTime() && sEnd > bt.startTime.getTime());

      if (blocked) {
        slot.available = false;
      }
    }

    return {
      resource: {
        id: resource.id,
        name: resource.name,
        slotDurationMinutes: resource.slotDurationMinutes,
        timezone: resource.timezone,
      },
      date,
      slots,
    };
  }
}
