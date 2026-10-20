import {
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
} from 'class-validator';
import {
  FormStatus,
  FinalAdmissionStatus,
  PaymentStatus,
  BoardingStatus,
} from '@prisma/client';

export class ExportBatchDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  admissionWaveId?: string;

  @IsOptional()
  @IsString()
  academicPeriodId?: string;

  @IsOptional()
  @IsEnum(FormStatus)
  formStatus?: FormStatus;

  @IsOptional()
  @IsEnum(FinalAdmissionStatus)
  finalStatus?: FinalAdmissionStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(BoardingStatus)
  boardingStatus?: BoardingStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  registrationIds?: string[];
}
