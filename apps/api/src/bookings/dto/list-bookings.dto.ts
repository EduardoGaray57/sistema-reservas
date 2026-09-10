import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class ListBookingsDto {
  @IsString()
  @IsNotEmpty({ message: 'resourceId query parameter is required' })
  resourceId!: string;

  @IsDateString({}, { message: 'Invalid date format. Expected YYYY-MM-DD' })
  date!: string;
}