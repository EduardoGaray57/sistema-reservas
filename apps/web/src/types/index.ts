/**
 * Frontend-local types mirroring the reserve-booking API contract
 * (see openspec change "sistema-reservas", design + resource-management,
 * availability-calendar and booking specs).
 */

export interface Resource {
  id: string;
  name: string;
  description: string | null;
  slotDurationMinutes: number;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = "CONFIRMED" | "CANCELLED";

export interface Booking {
  id: string;
  resourceId: string;
  startTime: string;
  endTime: string;
  guestName: string;
  guestEmail: string;
  status: BookingStatus;
  createdAt: string;
}

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

export interface CreateBookingInput {
  resourceId: string;
  /** UTC ISO 8601 start timestamp, e.g. "2026-09-14T14:00:00.000Z". */
  startTime: string;
  guestName: string;
  guestEmail: string;
}

/** NestJS global HttpExceptionFilter response body. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
}