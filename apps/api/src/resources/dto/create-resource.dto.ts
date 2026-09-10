import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateResourceDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  slotDurationMinutes?: number;

  @IsOptional()
  @IsString()
  timezone?: string;
}
