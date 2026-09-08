import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CBTQuestionType } from '@prisma/client';

export class CreateCbtExamDto {
  @IsString()
  @IsNotEmpty()
  classProgramId!: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  @Max(360)
  @IsOptional()
  durationMinutes?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCbtExamDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  @Max(360)
  @IsOptional()
  durationMinutes?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class QuestionOptionDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsBoolean()
  isCorrect!: boolean;

  @IsNumber()
  @IsOptional()
  orderNumber?: number;
}

export class CreateCbtQuestionDto {
  @IsEnum(CBTQuestionType)
  type!: CBTQuestionType;

  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsNumber()
  @Min(0.1)
  score!: number;

  @IsNumber()
  @IsOptional()
  orderNumber?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  @IsOptional()
  options?: QuestionOptionDto[];
}

export class UpdateCbtQuestionDto {
  @IsString()
  @IsOptional()
  question?: string;

  @IsNumber()
  @Min(0.1)
  @IsOptional()
  score?: number;

  @IsNumber()
  @IsOptional()
  orderNumber?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  @IsOptional()
  options?: QuestionOptionDto[];
}

export class SubmitCbtAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsString()
  @IsOptional()
  selectedOptionId?: string;

  @IsString()
  @IsOptional()
  essayAnswer?: string;

  @IsBoolean()
  @IsOptional()
  isFlagged?: boolean;
}

export class SingleEssayGradeDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsNumber()
  @Min(0)
  score!: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class GradeCbtEssayDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleEssayGradeDto)
  grades!: SingleEssayGradeDto[];
}

export class ImportCbtQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCbtQuestionDto)
  questions!: CreateCbtQuestionDto[];
}

export class VerifyCbtAttemptDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectCbtAttemptDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

