import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CheckInMethod } from '@prisma/client';

export class ScanCheckInDto {
  @IsString()
  @IsNotEmpty({ message: 'Token QR atau Nomor Registrasi wajib diisi.' })
  token!: string;

  @IsEnum(CheckInMethod, { message: 'Metode check-in harus QR_SCAN atau MANUAL_CODE.' })
  method!: CheckInMethod;

  @IsString()
  @IsOptional()
  notes?: string;
}
