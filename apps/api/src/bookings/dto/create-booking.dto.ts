import { IsString, IsNotEmpty, IsEmail, IsDateString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  resourceId!: string;

  @IsDateString({}, { message: 'startTime must be a valid ISO date string' })
  startTime!: string;

  @IsString()
  @IsNotEmpty({ message: 'guestName should not be empty' })
  guestName!: string;

  @IsEmail({}, { message: 'guestEmail must be a valid email address' })
  guestEmail!: string;
}