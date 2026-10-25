import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PracticalScheduleStatus, PracticalTestStatus } from '@prisma/client';

export class CreatePracticalScheduleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  academicPeriodId?: string;

  @IsString()
  @IsOptional()
  admissionWaveId?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  majorId?: string;

  @IsString()
  @IsOptional()
  classProgramId?: string;

  @IsDateString({}, { message: 'Format tanggal jadwal tidak valid (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Tanggal jadwal wajib diisi.' })
  scheduleDate!: string;

  @IsString()
  @IsNotEmpty({ message: 'Jam mulai wajib diisi (contoh: 08:00).' })
  startTime!: string;

  @IsString()
  @IsNotEmpty({ message: 'Jam selesai wajib diisi (contoh: 11:30).' })
  endTime!: string;

  @IsString()
  @IsOptional()
  roomLocation?: string;

  @IsString()
  @IsOptional()
  room?: string;

  @IsInt()
  @Min(1, { message: 'Kuota minimal 1 peserta.' })
  @Type(() => Number)
  quota: number = 10;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(PracticalScheduleStatus)
  @IsOptional()
  status?: PracticalScheduleStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  examinerUserIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  examinerIds?: string[];
}

export class UpdatePracticalScheduleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  academicPeriodId?: string;

  @IsString()
  @IsOptional()
  admissionWaveId?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  majorId?: string;

  @IsString()
  @IsOptional()
  classProgramId?: string;

  @IsDateString()
  @IsOptional()
  scheduleDate?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  roomLocation?: string;

  @IsString()
  @IsOptional()
  room?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  quota?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(PracticalScheduleStatus)
  @IsOptional()
  status?: PracticalScheduleStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  examinerUserIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  examinerIds?: string[];
}

export class AssignExaminersDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'Daftar penguji wajib diisi.' })
  examinerUserIds!: string[];
}

export class AssignPracticalParticipantsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'Pilih minimal satu calon santri.' })
  registrationIds!: string[];
}

export class MovePracticalParticipantScheduleDto {
  @IsString()
  @IsNotEmpty({ message: 'Jadwal tujuan wajib dipilih.' })
  targetScheduleId!: string;
}

export class SubmitPracticalScoreDto {
  @IsInt({ message: 'Nilai BTQ harus berupa bilangan bulat.' })
  @Min(1, { message: 'Nilai BTQ minimal 1.' })
  @Max(6, { message: 'Nilai BTQ maksimal 6.' })
  @Type(() => Number)
  btqScore!: number;

  @IsString()
  @IsOptional()
  btqNotes?: string;

  @IsInt({ message: 'Nilai Wudhu harus berupa bilangan bulat.' })
  @Min(1, { message: 'Nilai Wudhu minimal 1.' })
  @Max(4, { message: 'Nilai Wudhu maksimal 4.' })
  @Type(() => Number)
  wudhuScore!: number;

  @IsString()
  @IsOptional()
  wudhuNotes?: string;

  @IsInt({ message: 'Nilai Salat harus berupa bilangan bulat.' })
  @Min(1, { message: 'Nilai Salat minimal 1.' })
  @Max(4, { message: 'Nilai Salat maksimal 4.' })
  @Type(() => Number)
  salatScore!: number;

  @IsString()
  @IsOptional()
  salatNotes?: string;

  @IsString()
  @IsOptional()
  generalNotes?: string;

  @IsEnum(PracticalTestStatus)
  @IsOptional()
  status?: PracticalTestStatus;
}

export class PracticalCandidateFilterDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  status?: string; // 'ALL' | 'NOT_SCHEDULED' | 'SCHEDULED' | 'COMPLETED'

  @IsString()
  @IsOptional()
  scheduleId?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  academicPeriodId?: string;

  @IsString()
  @IsOptional()
  admissionWaveId?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}
