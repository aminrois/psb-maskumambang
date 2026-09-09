import { IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber, IsInt, Min, Max } from 'class-validator';
import { ParticipantType } from '@prisma/client';
import { Type } from 'class-transformer';

// --- SCHOOL (SEKOLAH) DTO ---
export class CreateSchoolDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama sekolah wajib diisi.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Slug sekolah wajib diisi.' })
  slug!: string;

  @IsString()
  @IsOptional()
  initial?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSchoolDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  initial?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export { CreateSchoolDto as CreateCategoryDto, UpdateSchoolDto as UpdateCategoryDto };

// --- MAJOR (JURUSAN) DTO ---
export class CreateMajorDto {
  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string; // Legacy fallback

  @IsString()
  @IsNotEmpty({ message: 'Nama jurusan wajib diisi.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Slug jurusan wajib diisi.' })
  slug!: string;
}

export class UpdateMajorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;
}

export { CreateMajorDto as CreateLevelDto, UpdateMajorDto as UpdateLevelDto };

// --- CLASS PROGRAM (PROGRAM KELAS) DTO ---
export class CreateClassProgramDto {
  @IsString()
  @IsOptional()
  majorId?: string;

  @IsString()
  @IsOptional()
  levelId?: string; // Legacy fallback

  @IsString()
  @IsNotEmpty({ message: 'Nama program kelas wajib diisi.' })
  name!: string;

  @IsEnum(ParticipantType, { message: 'Tipe partisipasi harus INDIVIDUAL atau TEAM.' })
  @IsOptional()
  participantType: ParticipantType = ParticipantType.INDIVIDUAL;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Biaya pendaftaran harus berupa angka.' })
  @Min(0, { message: 'Biaya pendaftaran tidak boleh negatif.' })
  registrationFee?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minTeamMembers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxTeamMembers?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  juknisUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRegistrants?: number;
}

export class UpdateClassProgramDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(ParticipantType)
  @IsOptional()
  participantType?: ParticipantType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  registrationFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minTeamMembers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxTeamMembers?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  juknisUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRegistrants?: number;
}

export { CreateClassProgramDto as CreateBranchDto, UpdateClassProgramDto as UpdateBranchDto };

// --- ACADEMIC PERIOD (PERIODE TAHUN PELAJARAN) DTO ---
export class CreateAcademicPeriodDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama periode tahun pelajaran wajib diisi.' })
  name!: string;

  @IsOptional()
  isActive?: boolean;
}

export class UpdateAcademicPeriodDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  isActive?: boolean;
}

// --- ADMISSION WAVE (GELOMBANG PENDAFTARAN) DTO ---
export class CreateAdmissionWaveDto {
  @IsString()
  @IsNotEmpty({ message: 'Periode tahun pelajaran wajib dipilih.' })
  academicPeriodId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama gelombang pendaftaran wajib diisi.' })
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  waveNumber?: number;

  @IsNotEmpty({ message: 'Tanggal mulai wajib diisi.' })
  startDate!: string | Date;

  @IsNotEmpty({ message: 'Tanggal berakhir wajib diisi.' })
  endDate!: string | Date;

  @Type(() => Number)
  @IsNumber({}, { message: 'Biaya pendaftaran harus berupa angka.' })
  @Min(0, { message: 'Biaya pendaftaran tidak boleh negatif.' })
  registrationFee!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Kuota pendaftaran harus berupa angka bulat.' })
  @Min(0, { message: 'Kuota pendaftaran tidak boleh negatif.' })
  quota?: number;

  @IsOptional()
  isActive?: boolean;
}

export class UpdateAdmissionWaveDto {
  @IsString()
  @IsOptional()
  academicPeriodId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  waveNumber?: number;

  @IsOptional()
  startDate?: string | Date;

  @IsOptional()
  endDate?: string | Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Biaya pendaftaran harus berupa angka.' })
  @Min(0, { message: 'Biaya pendaftaran tidak boleh negatif.' })
  registrationFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Kuota pendaftaran harus berupa angka bulat.' })
  @Min(0, { message: 'Kuota pendaftaran tidak boleh negatif.' })
  quota?: number;

  @IsOptional()
  isActive?: boolean;
}

