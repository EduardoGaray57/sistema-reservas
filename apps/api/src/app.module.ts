import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ResourcesModule } from './resources/resources.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingsModule } from './bookings/bookings.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [ResourcesModule, AvailabilityModule, BookingsModule],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    {
      // Same options as the pipe previously registered in main.ts.
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}