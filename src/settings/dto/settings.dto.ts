import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  application_name?: string;

  @IsString()
  @IsOptional()
  application_short_name?: string;

  @IsString()
  @IsOptional()
  application_description?: string;

  @IsString()
  @IsOptional()
  application_logo?: string;

  @IsString()
  @IsOptional()
  application_favicon?: string;

  @IsString()
  @IsOptional()
  countdown_enabled?: string;

  @IsString()
  @IsOptional()
  countdown_title?: string;

  @IsString()
  @IsOptional()
  countdown_target_date?: string;

  @IsString()
  @IsOptional()
  countdown_ended_text?: string;
}

export class ResetOperationalDataDto {
  @IsString()
  @IsNotEmpty({ message: 'Kode konfirmasi wajib diisi.' })
  confirmationCode!: string;
}
