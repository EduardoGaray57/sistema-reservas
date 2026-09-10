import { InjectionToken } from '@nestjs/common';

export interface BookingNotificationData {
  guestName: string;
  guestEmail: string;
  resourceId: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Abstraction for sending booking notifications (e.g., confirmation emails).
 *
 * PR 5 (tasks 5.3–5.4) replaces the default log-only provider with a real
 * Resend-backed implementation. The booking service only depends on this
 * token, so the swap is limited to the provider registration in
 * `bookings.module.ts`.
 */
export interface BookingNotificationSender {
  sendConfirmation(data: BookingNotificationData): Promise<void>;
}

export const BOOKING_NOTIFICATION_SENDER: InjectionToken = 'BOOKING_NOTIFICATION_SENDER';