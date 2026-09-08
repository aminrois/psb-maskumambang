import { IsNotEmpty, IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';

export class UploadPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'ID Pendaftaran wajib diisi.' })
  registrationId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Rekening pembayaran tujuan wajib dipilih.' })
  paymentAccountId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  senderBank?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  senderAccountName?: string;

  @IsDateString({}, { message: 'Format tanggal pembayaran tidak valid (YYYY-MM-DD).' })
  paymentDate!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReuploadPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'ID Pendaftaran wajib diisi.' })
  registrationId!: string;

  @IsString()
  @IsOptional()
  paymentAccountId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  senderBank?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  senderAccountName?: string;

  @IsDateString({}, { message: 'Format tanggal pembayaran tidak valid (YYYY-MM-DD).' })
  @IsOptional()
  paymentDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Alasan penolakan pembayaran wajib diisi.' })
  rejectionReason!: string;
}

export class CreatePaymentAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama bank / instansi keuangan wajib diisi.' })
  @MaxLength(100)
  bankName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nomor rekening wajib diisi.' })
  @MaxLength(50)
  accountNumber!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama pemilik rekening wajib diisi.' })
  @MaxLength(150)
  accountHolder!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  qrisImagePath?: string;
}

export class UpdatePaymentAccountDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  accountNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  accountHolder?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  qrisImagePath?: string;
}
