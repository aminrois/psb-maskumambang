import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Kata sandi saat ini wajib diisi.' })
  currentPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'Kata sandi baru wajib diisi.' })
  @MinLength(6, { message: 'Kata sandi baru minimal 6 karakter.' })
  newPassword!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Kata sandi baru wajib diisi.' })
  @MinLength(6, { message: 'Kata sandi baru minimal 6 karakter.' })
  newPassword!: string;
}

export class ChangeRoleDto {
  @IsEnum(Role, { message: 'Role harus SUPER_ADMIN, BENDAHARA, atau PESERTA.' })
  role!: Role;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Email wajib diisi.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nomor WhatsApp wajib diisi.' })
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password wajib diisi.' })
  @MinLength(6, { message: 'Password minimal 6 karakter.' })
  password!: string;

  @IsEnum(Role, { message: 'Role harus SUPER_ADMIN, BENDAHARA, atau PESERTA.' })
  @IsOptional()
  role?: Role;
}
