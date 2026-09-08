import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi.' })
  name!: string;

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
}
