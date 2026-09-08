import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PaymentsService } from './payments.service';
import {
  UploadPaymentDto,
  ReuploadPaymentDto,
  RejectPaymentDto,
  CreatePaymentAccountDto,
} from './dto/payment.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PaymentStatus, Role } from '@prisma/client';
import { Response } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // --- Payment Accounts ---

  @Public()
  @Get('accounts')
  async getActiveAccounts() {
    const accounts = await this.paymentsService.getActiveAccounts();
    return { success: true, data: accounts };
  }

  @Roles(Role.SUPER_ADMIN)
  @Get('accounts/all')
  async getAllAccounts() {
    const accounts = await this.paymentsService.getAllAccounts();
    return { success: true, data: accounts };
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('accounts')
  async createAccount(@Body() dto: CreatePaymentAccountDto) {
    const created = await this.paymentsService.createAccount(dto);
    return { success: true, message: 'Rekening pembayaran berhasil ditambahkan.', data: created };
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch('accounts/:id')
  async updateAccount(
    @Param('id') id: string,
    @Body() dto: import('./dto/payment.dto').UpdatePaymentAccountDto,
  ) {
    const updated = await this.paymentsService.updateAccount(id, dto);
    return { success: true, message: 'Rekening pembayaran berhasil diperbarui.', data: updated };
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('accounts/:id/qris')
  @UseInterceptors(FileInterceptor('qris_image'))
  async uploadQrisImage(
    @Param('id') accountId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('File gambar QRIS (qris_image) wajib diunggah.');
    }
    const result = await this.paymentsService.uploadQrisImage(accountId, file.buffer, file.originalname);
    return { success: true, message: 'Gambar QRIS berhasil diunggah.', data: result };
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete('accounts/:id/qris')
  async deleteQrisImage(@Param('id') accountId: string) {
    await this.paymentsService.deleteQrisImage(accountId);
    return { success: true, message: 'Gambar QRIS berhasil dihapus.' };
  }

  @Public()
  @Get('accounts/qris/:filename')
  async serveQrisImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const { filePath } = await this.paymentsService.getQrisImageFile(filename);
    return res.sendFile(filePath);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete('accounts/:id')
  async deleteAccount(@Param('id') id: string) {
    const deleted = await this.paymentsService.deleteAccount(id);
    return { success: true, message: 'Rekening pembayaran berhasil dihapus.', data: deleted };
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch('accounts/:id/toggle')
  async toggleAccount(@Param('id') id: string) {
    const toggled = await this.paymentsService.toggleAccount(id);
    return {
      success: true,
      message: `Status rekening diubah menjadi: ${toggled.isActive ? 'AKTIF' : 'NONAKTIF'}`,
      data: toggled,
    };
  }

  // --- Payment Upload & Re-upload (Peserta) ---

  @Roles(Role.PESERTA)
  @Post('upload')
  @UseInterceptors(FileInterceptor('payment_proof'))
  async uploadPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: UploadPaymentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('File bukti pembayaran (payment_proof) wajib diunggah.');
    }

    const payment = await this.paymentsService.uploadPayment(
      userId,
      dto,
      file.buffer,
      file.originalname,
    );

    return {
      success: true,
      message: 'Bukti pembayaran berhasil diunggah dan sedang menunggu verifikasi panitia.',
      data: payment,
    };
  }

  @Roles(Role.PESERTA)
  @Post('reupload')
  @UseInterceptors(FileInterceptor('payment_proof'))
  async reuploadPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: ReuploadPaymentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('File bukti pembayaran baru (payment_proof) wajib diunggah.');
    }

    const payment = await this.paymentsService.reuploadPayment(
      userId,
      dto,
      file.buffer,
      file.originalname,
    );

    return {
      success: true,
      message: 'Bukti pembayaran baru berhasil dikirim dan menunggu verifikasi ulang.',
      data: payment,
    };
  }

  // --- Payment Verification (Bendahara & Admin) ---

  @Roles(Role.BENDAHARA, Role.SUPER_ADMIN)
  @Get('list')
  async listPayments(
    @Query('status') status?: PaymentStatus,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    const data = await this.paymentsService.listPayments(
      status,
      search,
      parseInt(page, 10) || 1,
      parseInt(perPage, 10) || 25,
    );
    return { success: true, ...data };
  }

  @Roles(Role.BENDAHARA, Role.SUPER_ADMIN)
  @Post(':id/approve')
  async approvePayment(
    @Param('id') paymentId: string,
    @CurrentUser('id') staffId: string,
  ) {
    const payment = await this.paymentsService.approvePayment(paymentId, staffId);
    return {
      success: true,
      message: 'Pembayaran BERHASIL disetujui! Kartu peserta & QR Code kini aktif.',
      data: payment,
    };
  }

  @Roles(Role.BENDAHARA, Role.SUPER_ADMIN)
  @Post(':id/reject')
  async rejectPayment(
    @Param('id') paymentId: string,
    @CurrentUser('id') staffId: string,
    @Body() dto: RejectPaymentDto,
  ) {
    const payment = await this.paymentsService.rejectPayment(paymentId, staffId, dto);
    return {
      success: true,
      message: 'Pembayaran telah DITOLAK. Peserta dapat mengunggah bukti perbaikan.',
      data: payment,
    };
  }

  // --- Protected File Streaming (IDOR Guard) ---

  @Get('file/:filename')
  async streamPaymentProof(
    @Param('filename') filename: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Res() res: Response,
  ) {
    const { filePath } = await this.paymentsService.getPaymentProofFile(filename, userId, role);
    return res.sendFile(filePath);
  }
}
