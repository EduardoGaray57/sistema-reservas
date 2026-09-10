import { Module } from '@nestjs/common';
import { ResourcesModule } from './resources/resources.module';
import { AvailabilityModule } from './availability/availability.module';

@Module({
  imports: [ResourcesModule, AvailabilityModule],
})
export class AppModule {}
