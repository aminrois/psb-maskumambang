import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString({ message: 'Username harus berupa string.' })
  username?: string;

  @IsOptional()
  @IsString({ message: 'Email harus berupa string.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Identitas login harus berupa string.' })
  identifier?: string;

  @IsString({ message: 'Kata sandi harus berupa string.' })
  @IsNotEmpty({ message: 'Kata sandi wajib diisi.' })
  @MinLength(6, { message: 'Kata sandi minimal 6 karakter.' })
  password!: string;

  @IsOptional()
  @IsString({ message: 'Captcha token harus berupa string.' })
  captchaToken?: string;
}
