import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsNotEmpty({ message: 'Email wajib diisi.' })
  @IsEmail({}, { message: 'Format email tidak valid.' })
  email!: string;
}
