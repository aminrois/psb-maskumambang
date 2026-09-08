import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Token reset kata sandi wajib disertakan.' })
  token!: string;

  @IsNotEmpty({ message: 'Kata sandi baru wajib diisi.' })
  @MinLength(6, { message: 'Kata sandi baru minimal 6 karakter.' })
  password!: string;
}

export class VerifyResetTokenDto {
  @IsNotEmpty({ message: 'Token wajib disertakan.' })
  token!: string;
}
