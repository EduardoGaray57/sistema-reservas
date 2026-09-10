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
 * The booking service only depends on this token, so swapping the
 * implementation is limited to provider registration. Implementations:
 * - PR 4: log-only provider in `bookings.module.ts`
 * - PR 6: Resend-backed `EmailService` (see `email/email.service.ts`)
 */
export interface BookingNotificationSender {
  sendConfirmation(data: BookingNotificationData): Promise<void>;
}

export const BOOKING_NOTIFICATION_SENDER: InjectionToken = 'BOOKING_NOTIFICATION_SENDER';