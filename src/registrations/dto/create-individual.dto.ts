import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Gender, BoardingStatus } from '@prisma/client';

export class CreateIndividualRegistrationDto {
  @IsString()
  @IsOptional()
  academicPeriodId?: string;

  @IsString()
  @IsOptional()
  periodId?: string;

  @IsString()
  @IsOptional()
  admissionWaveId?: string;

  @IsString()
  @IsOptional()
  waveId?: string;

  @IsString()
  @IsOptional()
  classProgramId?: string;

  @IsString()
  @IsOptional()
  branchId?: string; // Compatibility fallback for classProgramId

  @IsEnum(BoardingStatus, { message: 'Status mukim harus MUKIM atau NON_MUKIM.' })
  @IsOptional()
  boardingStatus?: BoardingStatus = BoardingStatus.MUKIM;

  @IsString()
  @IsOptional()
  mukimStatus?: string; // Fallback compatibility

  @IsString()
  @IsNotEmpty({ message: 'Nama lengkap calon siswa wajib diisi.' })
  @MaxLength(150, { message: 'Nama maksimal 150 karakter.' })
  fullName!: string;

  @IsEnum(Gender, { message: 'Jenis kelamin harus L (Laki-laki) atau P (Perempuan).' })
  @IsOptional()
  gender?: Gender = Gender.L;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  gradeClass?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  schoolName?: string;

  @IsString()
  @IsOptional()
  schoolAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  mentorName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  whatsappNumber?: string;
}

