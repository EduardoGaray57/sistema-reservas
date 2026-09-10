import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BOOKING_NOTIFICATION_SENDER } from './booking-notification.interface';
import { EmailService } from './email.service';

@Module({
  providers: [
    PrismaService,
    EmailService,
    // Re-expose EmailService under the booking notification contract token so
    // BookingsService keeps depending only on the abstraction.
    { provide: BOOKING_NOTIFICATION_SENDER, useExisting: EmailService },
  ],
  exports: [EmailService, BOOKING_NOTIFICATION_SENDER],
})
export class EmailModule {}