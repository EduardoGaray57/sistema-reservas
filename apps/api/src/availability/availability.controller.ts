import { Controller, Get, Param, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { GetAvailabilityDto } from './dto/get-availability.dto';

@Controller('api/resources/:resourceId/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  getAvailability(
    @Param('resourceId') resourceId: string,
    @Query() query: GetAvailabilityDto,
  ) {
    return this.availabilityService.getAvailableSlots(resourceId, query.date);
  }
}
