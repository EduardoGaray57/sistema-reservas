import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { renderBookingConfirmation } from '@sistema-reservas/shared';
import { PrismaService } from '../prisma.service';
import {
  BookingNotificationData,
  BookingNotificationSender,
} from './booking-notification.interface';

const DEFAULT_EMAIL_FROM = 'noreply@resend.dev';

/**
 * Resend-backed booking notification sender.
 *
 * Fire-and-forget by contract: every failure path logs and returns instead of
 * throwing, so an email outage can never fail the booking request. Env vars
 * are read lazily at send time (Prisma loads `.env` into `process.env` when
 * the app boots, so a constructor-time read could race it).
 */
@Injectable()
export class EmailService implements BookingNotificationSender {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendConfirmation(data: BookingNotificationData): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Degraded mode: no key configured — skip instead of failing the booking.
      this.logger.log(
        'RESEND_API_KEY not set — skipping confirmation email (degraded mode)',
      );
      return;
    }

    const resource = await this.prisma.resource.findUnique({
      where: { id: data.resourceId },
      select: { name: true, timezone: true },
    });
    if (!resource) {
      this.logger.warn(
        `Skipping confirmation email: resource "${data.resourceId}" no longer exists`,
      );
      return;
    }

    const html = await renderBookingConfirmation({
      guestName: data.guestName,
      resourceName: resource.name,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: resource.timezone,
    });

    try {
      const resend = new Resend(apiKey);
      const { data: sent, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
        to: data.guestEmail,
        subject: `Booking confirmed — ${resource.name}`,
        html,
      });

      if (error) {
        this.logger.error(
          `Resend rejected confirmation email for ${data.guestEmail}: ${error.message}`,
        );
        return;
      }
      this.logger.log(
        `Confirmation email sent to ${data.guestEmail} (id=${sent?.id})`,
      );
    } catch (err) {
      this.logger.error(
        `Confirmation email failed for ${data.guestEmail}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}