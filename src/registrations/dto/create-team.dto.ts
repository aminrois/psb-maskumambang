import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from '@prisma/client';

export class TeamMemberDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama anggota tim wajib diisi.' })
  @MaxLength(150)
  memberName!: string;

  @IsEnum(Gender, { message: 'Jenis kelamin anggota harus L atau P.' })
  gender!: Gender;

  @IsString()
  @IsNotEmpty({ message: 'Kelas anggota wajib diisi.' })
  @MaxLength(50)
  gradeClass!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  positionRole?: string;
}

export class CreateTeamRegistrationDto {
  @IsString()
  @IsNotEmpty({ message: 'ID Cabang lomba wajib diisi.' })
  branchId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama tim wajib diisi.' })
  @MaxLength(150)
  teamName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama asal sekolah wajib diisi.' })
  @MaxLength(200)
  schoolName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Alamat sekolah wajib diisi.' })
  schoolAddress!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama guru pembimbing / pelatih wajib diisi.' })
  @MaxLength(150)
  mentorName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nomor WhatsApp kontak tim wajib diisi.' })
  @MaxLength(30)
  whatsappNumber!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama ketua tim wajib diisi.' })
  @MaxLength(150)
  leaderName!: string;

  @IsArray({ message: 'Daftar anggota tim harus berupa array.' })
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  members!: TeamMemberDto[];
}
