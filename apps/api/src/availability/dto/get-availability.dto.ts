import { IsDateString, IsNotEmpty } from 'class-validator';

export class GetAvailabilityDto {
  @IsNotEmpty({ message: 'date query parameter is required' })
  @IsDateString({}, { message: 'Invalid date format. Expected YYYY-MM-DD' })
  date: string;
}
