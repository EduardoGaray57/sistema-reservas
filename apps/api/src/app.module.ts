import { Module } from '@nestjs/common';
import { ResourcesModule } from './resources/resources.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [ResourcesModule, AvailabilityModule, BookingsModule],
})
export class AppModule {}
