import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Gender,
  ChildStatus,
  PreviousSchoolLevel,
  ParentStatus,
  EducationLevel,
  IncomeRange,
} from '@prisma/client';

export class AchievementItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama prestasi wajib diisi.' })
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Jenis prestasi wajib diisi.' })
  @MaxLength(100)
  type!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tingkat prestasi wajib diisi.' })
  @MaxLength(100)
  level!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tahun prestasi wajib diisi.' })
  @MaxLength(10)
  year!: string;

  @IsString()
  @IsNotEmpty({ message: 'Peringkat prestasi wajib diisi.' })
  @MaxLength(50)
  rank!: string;
}

export class SaveFormDraftDto {
  // Section A: Identitas
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nik?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  familyCardNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nisn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  birthCertificateNumber?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  birthPlace?: string;

  @IsOptional()
  birthDate?: string | Date;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  religion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  bloodType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  childOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  siblingsCount?: number;

  @IsOptional()
  @IsEnum(ChildStatus)
  childStatus?: ChildStatus;

  // Section B: Alamat
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  provinceCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cityDistrict?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  regencyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subDistrict?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  districtCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  village?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  villageCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  rt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  rw?: string;

  @IsOptional()
  @IsString()
  fullAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  // Section C: Data Asal Sekolah
  @IsOptional()
  @IsString()
  @MaxLength(200)
  previousSchoolName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  previousSchoolNpsn?: string;

  @IsOptional()
  @IsEnum(PreviousSchoolLevel)
  previousSchoolLevel?: PreviousSchoolLevel;

  @IsOptional()
  @IsString()
  previousSchoolAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  graduationYear?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  diplomaNumber?: string;

  // Section D: Data Ayah
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fatherName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  fatherNik?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fatherBirthPlace?: string;

  @IsOptional()
  fatherBirthDate?: string | Date;

  @IsOptional()
  @IsEnum(ParentStatus)
  fatherStatus?: ParentStatus;

  @IsOptional()
  @IsEnum(EducationLevel)
  fatherEducation?: EducationLevel;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fatherOccupation?: string;

  @IsOptional()
  @IsEnum(IncomeRange)
  fatherMonthlyIncome?: IncomeRange;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  fatherWhatsapp?: string;

  // Section E: Data Ibu
  @IsOptional()
  @IsString()
  @MaxLength(150)
  motherName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  motherNik?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  motherBirthPlace?: string;

  @IsOptional()
  motherBirthDate?: string | Date;

  @IsOptional()
  @IsEnum(ParentStatus)
  motherStatus?: ParentStatus;

  @IsOptional()
  @IsEnum(EducationLevel)
  motherEducation?: EducationLevel;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  motherOccupation?: string;

  @IsOptional()
  @IsEnum(IncomeRange)
  motherMonthlyIncome?: IncomeRange;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  motherWhatsapp?: string;

  // Section F: Data Wali
  @IsOptional()
  @IsBoolean()
  hasGuardian?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  guardianRelation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  guardianName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guardianNik?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  guardianBirthPlace?: string;

  @IsOptional()
  guardianBirthDate?: string | Date;

  @IsOptional()
  @IsEnum(EducationLevel)
  guardianEducation?: EducationLevel;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  guardianOccupation?: string;

  @IsOptional()
  @IsEnum(IncomeRange)
  guardianMonthlyIncome?: IncomeRange;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  guardianWhatsapp?: string;

  @IsOptional()
  @IsString()
  guardianAddress?: string;

  // Section G: Kontak Utama
  @IsOptional()
  @IsString()
  @MaxLength(150)
  primaryContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  primaryContactRelation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  primaryContactWhatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  primaryContactEmail?: string;

  // Section H: Data Tambahan
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  heightCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  weightKg?: number;

  @IsOptional()
  @IsBoolean()
  hasSpecialNeeds?: boolean;

  @IsOptional()
  @IsString()
  specialNeedsDescription?: string;

  @IsOptional()
  @IsBoolean()
  hasAchievements?: boolean;

  // Achievements
  @IsOptional()
  achievements?: AchievementItemDto[];
}

export class SubmitFullFormDto extends SaveFormDraftDto {}

export class RequestRevisionDto {
  @IsString()
  @IsNotEmpty({ message: 'Catatan/alasan revisi wajib diisi.' })
  revisionNotes!: string;
}
