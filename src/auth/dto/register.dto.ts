import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Username wajib diisi.' })
  @MinLength(3, { message: 'Username minimal 3 karakter.' })
  @MaxLength(30, { message: 'Username maksimal 30 karakter.' })
  @Matches(/^[a-zA-Z0-9._]+$/, { message: 'Username hanya boleh huruf, angka, titik (.), dan garis bawah (_).' })
  username!: string;

  @IsEmail({}, { message: 'Format email tidak valid.' })
  @IsNotEmpty({ message: 'Email wajib diisi.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nomor WhatsApp / telepon wajib diisi.' })
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty({ message: 'Kata sandi wajib diisi.' })
  @MinLength(6, { message: 'Kata sandi minimal 6 karakter.' })
  password!: string;

  @IsOptional()
  @IsString({ message: 'Captcha token harus berupa string.' })
  captchaToken?: string;
}
