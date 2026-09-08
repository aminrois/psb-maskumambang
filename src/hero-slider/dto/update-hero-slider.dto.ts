import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateHeroSliderDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  badge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  primaryButtonText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryButtonUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  secondaryButtonText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  secondaryButtonUrl?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? parseInt(value, 10) : undefined))
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean()
  removeMobileImage?: boolean;
}
