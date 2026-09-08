import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AnswerNoteMode,
  InterviewPackageStatus,
  InterviewRecommendation,
  InterviewScheduleStatus,
  InterviewStatus,
} from '@prisma/client';

// ==========================================
// KATEGORI PERTANYAAN DTO
// ==========================================
export class CreateInterviewCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama kategori wajib diisi.' })
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateInterviewCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ==========================================
// BANK PERTANYAAN DTO
// ==========================================
export class CreateInterviewQuestionDto {
  @IsString()
  @IsNotEmpty({ message: 'Kategori pertanyaan wajib dipilih.' })
  categoryId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Pertanyaan wajib diisi.' })
  question!: string;

  @IsString()
  @IsOptional()
  interviewerGuidance?: string;

  @IsString()
  @IsOptional()
  academicPeriodId?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  majorId?: string;

  @IsString()
  @IsOptional()
  classProgramId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateInterviewQuestionDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  question?: string;

  @IsString()
  @IsOptional()
  interviewerGuidance?: string;

  @IsString()
  @IsOptional()
  academicPeriodId?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  majorId?: string;

  @IsString()
  @IsOptional()
  classProgramId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ==========================================
// PAKET WAWANCARA DTO
// ==========================================
export class CreateInterviewPackageDto {
  @IsString()
  @IsNotEmpty({ message: 'Kode paket wajib diisi.' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama paket wajib diisi.' })
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  academicPeriodId?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  majorId?: string;

  @IsString()
  @IsOptional()
  classProgramId?: string;

  @IsEnum(InterviewPackageStatus)
  @IsOptional()
  status?: InterviewPackageStatus;
}

export class UpdateInterviewPackageDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  academicPeriodId?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  majorId?: string;

  @IsString()
  @IsOptional()
  classProgramId?: string;

  @IsEnum(InterviewPackageStatus)
  @IsOptional()
  status?: InterviewPackageStatus;
}

export class AddQuestionToPackageDto {
  @IsString()
  @IsNotEmpty({ message: 'ID Pertanyaan wajib diisi.' })
  questionId!: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsEnum(AnswerNoteMode)
  @IsOptional()
  answerNoteMode?: AnswerNoteMode;
}

export class PackageQuestionOrderItemDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsInt()
  sortOrder!: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsEnum(AnswerNoteMode)
  @IsOptional()
  answerNoteMode?: AnswerNoteMode;
}

export class UpdatePackageQuestionsOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageQuestionOrderItemDto)
  items!: PackageQuestionOrderItemDto[];
}

export class DuplicatePackageDto {
  @IsString()
  @IsNotEmpty({ message: 'Kode paket baru wajib diisi.' })
  newCode!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama paket baru wajib diisi.' })
  newName!: string;

  @IsString()
  @IsOptional()
  newAcademicPeriodId?: string;
}

// ==========================================
// ASPEK PENILAIAN DTO
// ==========================================
export class CreateInterviewAspectDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama aspek penilaian wajib diisi.' })
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minScore?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxScore?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultWeight?: number;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateInterviewAspectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minScore?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxScore?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultWeight?: number;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AspectConfigItemDto {
  @IsString()
  @IsNotEmpty()
  aspectId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minScore?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxScore?: number;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class SaveAspectConfigsDto {
  @IsString()
  @IsOptional()
  academicPeriodId?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  majorId?: string;

  @IsString()
  @IsOptional()
  classProgramId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AspectConfigItemDto)
  configs!: AspectConfigItemDto[];
}

// ==========================================
// JADWAL WAWANCARA DTO
// ==========================================
export class CreateInterviewScheduleDto {
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

  @IsString()
  @IsOptional()
  packageId?: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Tanggal jadwal wajib diisi.' })
  scheduleDate!: string;

  @IsString()
  @IsNotEmpty({ message: 'Jam mulai wajib diisi.' })
  startTime!: string;

  @IsString()
  @IsNotEmpty({ message: 'Jam selesai wajib diisi.' })
  endTime!: string;

  @IsString()
  @IsNotEmpty({ message: 'Lokasi / Ruang wajib diisi.' })
  roomLocation!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  quota?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(InterviewScheduleStatus)
  @IsOptional()
  status?: InterviewScheduleStatus;

  @IsString()
  @IsOptional()
  interviewerUserId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interviewerUserIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  questions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  registrationIds?: string[];
}

export class UpdateInterviewScheduleDto {
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

  @IsString()
  @IsOptional()
  packageId?: string;

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

  @IsInt()
  @Min(1)
  @IsOptional()
  quota?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(InterviewScheduleStatus)
  @IsOptional()
  status?: InterviewScheduleStatus;

  @IsString()
  @IsOptional()
  interviewerUserId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interviewerUserIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  questions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  registrationIds?: string[];
}

export class AssignInterviewersDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'Daftar ID Pewawancara wajib disediakan.' })
  interviewerUserIds!: string[];
}

export class AssignParticipantsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'Daftar ID Pendaftaran wajib disediakan.' })
  registrationIds!: string[];

  @IsString()
  @IsOptional()
  scheduleId?: string;

  @IsString()
  @IsOptional()
  interviewerId?: string;

  @IsString()
  @IsOptional()
  packageId?: string;
}

export class MoveParticipantScheduleDto {
  @IsString()
  @IsNotEmpty({ message: 'ID Pendaftaran wajib diisi.' })
  registrationId!: string;

  @IsString()
  @IsNotEmpty({ message: 'ID Jadwal baru wajib diisi.' })
  targetScheduleId!: string;

  @IsString()
  @IsOptional()
  targetInterviewerId?: string;

  @IsString()
  @IsOptional()
  targetPackageId?: string;
}

// ==========================================
// CHECK-IN DTO
// ==========================================
export class CheckInParticipantDto {
  @IsString()
  @IsNotEmpty({ message: 'QR Code / Nomor Pendaftaran wajib diisi.' })
  identifier!: string; // registrationNumber / qrCodeToken / registrationId

  @IsEnum(InterviewStatus)
  @IsOptional()
  status?: InterviewStatus; // CHECKED_IN or ABSENT
}

// ==========================================
// PENILAIAN & PROSES WAWANCARA DTO
// ==========================================
export class QuestionNoteItemDto {
  @IsString()
  @IsOptional()
  questionId?: string;

  @IsString()
  @IsNotEmpty()
  questionText!: string;

  @IsString()
  @IsOptional()
  categoryName?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isCustomQuestion?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class AspectScoreItemDto {
  @IsString()
  @IsOptional()
  aspectId?: string;

  @IsString()
  @IsNotEmpty()
  aspectName!: string;

  @IsNumber()
  @Min(0)
  score!: number;

  @IsNumber()
  @Min(0)
  weight!: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxScore?: number;
}

export class SaveInterviewAssessmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionNoteItemDto)
  @IsOptional()
  questionNotes?: QuestionNoteItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AspectScoreItemDto)
  @IsOptional()
  scores?: AspectScoreItemDto[];

  @IsString()
  @IsOptional()
  generalNotes?: string;

  @IsEnum(InterviewRecommendation)
  @IsOptional()
  recommendation?: InterviewRecommendation;

  @IsBoolean()
  @IsOptional()
  isComplete?: boolean; // false = DRAFT, true = SELESAI
}

export class AdminUpdateInterviewDto extends SaveInterviewAssessmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Alasan perubahan wajib diisi untuk audit log.' })
  auditReason!: string;
}
