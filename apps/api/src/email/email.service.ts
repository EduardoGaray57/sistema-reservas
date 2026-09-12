import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { renderBookingConfirmation } from '@sistema-reservas/shared';
import { PrismaService } from '../prisma.service';
import {
  BookingNotificationData,
  BookingNotificationSender,
} from './booking-notification.interface';

const DEFAULT_EMAIL_FROM = 'noreply@resend.dev';

/**
 * Booking notification sender backed by local SMTP (Mailpit) or Resend.
 *
 * Transport resolution order:
 *  1. SMTP locally if MAIL_HOST + MAIL_PORT are set (dev: Mailpit).
 *  2. Resend if RESEND_API_KEY is set.
 *  3. Degraded mode: skip with a logged notice.
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
    const smtpHost = process.env.MAIL_HOST;
    const smtpPortRaw = process.env.MAIL_PORT;
    const apiKey = process.env.RESEND_API_KEY;

    if (!smtpHost && !smtpPortRaw && !apiKey) {
      // Degraded mode: no transport configured — skip instead of failing the booking.
      this.logger.log(
        'No mail transport configured (MAIL_HOST/MAIL_PORT or RESEND_API_KEY) — skipping confirmation email (degraded mode)',
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

    const from = process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM;
    const to = data.guestEmail;
    const subject = `Booking confirmed — ${resource.name}`;

    try {
      if (smtpHost && smtpPortRaw) {
        const smtpPort = Number(smtpPortRaw);
        const transport = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: false, // local dev SMTP (Mailpit) has no TLS
        });
        const info = await transport.sendMail({ from, to, subject, html });
        this.logger.log(
          `Confirmation email sent to ${to} via SMTP (messageId=${info.messageId})`,
        );
        return;
      }

      const resend = new Resend(apiKey as string);
      const { data: sent, error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(
          `Resend rejected confirmation email for ${to}: ${error.message}`,
        );
        return;
      }
      this.logger.log(
        `Confirmation email sent to ${to} (id=${sent?.id})`,
      );
    } catch (err) {
      this.logger.error(
        `Confirmation email failed for ${to}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}