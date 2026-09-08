import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { FileValidatorUtil } from '../common/utils/file-validator.util';
import {
  UploadPaymentDto,
  ReuploadPaymentDto,
  RejectPaymentDto,
  CreatePaymentAccountDto,
} from './dto/payment.dto';
import { PaymentStatus, RegistrationStatus, Role, VerificationAction } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PaymentsService {
  private readonly uploadDir: string;
  private readonly qrisDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    const baseUpload = this.configService.get<string>('upload.folder') || 'uploads';
    this.uploadDir = path.resolve(process.cwd(), baseUpload, 'payment_proofs');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    this.qrisDir = path.resolve(process.cwd(), baseUpload, 'qris_images');
    if (!fs.existsSync(this.qrisDir)) {
      fs.mkdirSync(this.qrisDir, { recursive: true });
    }
  }

  // --- Payment Accounts ---

  async getActiveAccounts() {
    return this.prisma.paymentAccount.findMany({
      where: { isActive: true },
      orderBy: { bankName: 'asc' },
    });
  }

  async getAllAccounts() {
    return this.prisma.paymentAccount.findMany({
      orderBy: { bankName: 'asc' },
    });
  }

  async createAccount(dto: CreatePaymentAccountDto) {
    return this.prisma.paymentAccount.create({
      data: {
        bankName: dto.bankName.trim(),
        accountNumber: dto.accountNumber.trim(),
        accountHolder: dto.accountHolder.trim(),
        qrisImagePath: dto.qrisImagePath?.trim() || null,
        isActive: true,
      },
    });
  }

  async uploadQrisImage(accountId: string, fileBuffer: Buffer, originalFilename?: string): Promise<{ filename: string }> {
    const account = await this.prisma.paymentAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Rekening pembayaran tidak ditemukan.');

    const validatedFile = FileValidatorUtil.validateImageBuffer(fileBuffer, originalFilename);
    const diskPath = path.join(this.qrisDir, validatedFile.storageFilename);
    await fs.promises.writeFile(diskPath, fileBuffer);

    // Hapus file lama jika ada
    if (account.qrisImagePath) {
      const oldPath = path.join(this.qrisDir, account.qrisImagePath);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await this.prisma.paymentAccount.update({
      where: { id: accountId },
      data: { qrisImagePath: validatedFile.storageFilename },
    });

    return { filename: validatedFile.storageFilename };
  }

  async deleteQrisImage(accountId: string): Promise<void> {
    const account = await this.prisma.paymentAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Rekening pembayaran tidak ditemukan.');
    if (!account.qrisImagePath) return;

    const filePath = path.join(this.qrisDir, account.qrisImagePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await this.prisma.paymentAccount.update({
      where: { id: accountId },
      data: { qrisImagePath: null },
    });
  }

  async getQrisImageFile(filename: string): Promise<{ filePath: string }> {
    const sanitized = FileValidatorUtil.sanitizeFilename(filename);
    const candidatePaths = [
      path.join(this.qrisDir, sanitized),
      path.resolve(process.cwd(), 'uploads/qris_images', sanitized),
      path.resolve(process.cwd(), '../uploads/qris_images', sanitized),
      path.resolve(process.cwd(), 'uploads', sanitized),
      path.resolve(process.cwd(), 'public/uploads/qris_images', sanitized),
    ];

    const filePath = candidatePaths.find((p) => fs.existsSync(p));
    if (!filePath) throw new NotFoundException('File QRIS tidak ditemukan.');
    return { filePath };
  }

  async updateAccount(id: string, dto: import('./dto/payment.dto').UpdatePaymentAccountDto) {
    const account = await this.prisma.paymentAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException('Rekening pembayaran tidak ditemukan.');
    }

    return this.prisma.paymentAccount.update({
      where: { id },
      data: {
        bankName: dto.bankName?.trim(),
        accountNumber: dto.accountNumber?.trim(),
        accountHolder: dto.accountHolder?.trim(),
        ...(dto.qrisImagePath !== undefined && { qrisImagePath: dto.qrisImagePath?.trim() || null }),
      },
    });
  }

  async deleteAccount(id: string) {
    const account = await this.prisma.paymentAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Rekening pembayaran tidak ditemukan.');
    }

    // Set any referencing payments' paymentAccountId to null first to ensure clean deletion
    await this.prisma.payment.updateMany({
      where: { paymentAccountId: id },
      data: { paymentAccountId: null },
    });

    return this.prisma.paymentAccount.delete({
      where: { id },
    });
  }

  async toggleAccount(id: string) {
    const account = await this.prisma.paymentAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException('Rekening pembayaran tidak ditemukan.');
    }

    return this.prisma.paymentAccount.update({
      where: { id },
      data: { isActive: !account.isActive },
    });
  }

  // --- Payment Submission ---

  /**
   * Submits payment proof for a registration.
   * Enforces: Ownership (IDOR check), Active account, Dynamic fee from DB, Magic Byte validation.
   */
  async uploadPayment(
    userId: string,
    dto: UploadPaymentDto,
    fileBuffer: Buffer,
    originalFilename?: string,
  ) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: dto.registrationId },
      include: { classProgram: true, admissionWave: true },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran tidak ditemukan.');
    }

    // IDOR Protection: Must be the owner
    if (reg.userId !== userId) {
      throw new ForbiddenException('Akses ditolak: Anda bukan pemilik pendaftaran ini.');
    }

    // Validate payment account
    const account = await this.prisma.paymentAccount.findUnique({
      where: { id: dto.paymentAccountId },
    });

    if (!account || !account.isActive) {
      throw new BadRequestException('Rekening bank pembayaran tidak valid atau sedang tidak aktif.');
    }

    // Validate binary content & magic bytes
    const validatedFile = FileValidatorUtil.validateImageBuffer(fileBuffer, originalFilename);

    // Save file to disk
    const diskPath = path.join(this.uploadDir, validatedFile.storageFilename);
    await fs.promises.writeFile(diskPath, fileBuffer);

    // Dynamic fee from Admission Wave configuration (fallback to ClassProgram / default 500,000)
    const actualFee = reg.admissionWave?.registrationFee
      ? Number(reg.admissionWave.registrationFee)
      : (reg.classProgram?.registrationFee ? Number(reg.classProgram.registrationFee) : 500000.00);

    // Atomic transaction
    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          registrationId: reg.id,
          paymentAccountId: account.id,
          amount: actualFee,
          proofImagePath: validatedFile.storageFilename,
          senderBank: dto.senderBank?.trim(),
          senderAccountName: dto.senderAccountName?.trim(),
          paymentDate: new Date(dto.paymentDate),
          status: PaymentStatus.WAITING_VERIFICATION,
          notes: dto.notes?.trim(),
        },
      });

      await tx.registration.update({
        where: { id: reg.id },
        data: { status: RegistrationStatus.WAITING_VERIFICATION },
      });

      return p;
    });

    await this.auditService.log({
      userId,
      action: 'UPLOAD_PAYMENT',
      targetTable: 'payments',
      targetId: payment.id,
      details: `Upload bukti pembayaran untuk pendaftaran ${reg.registrationNumber} (Nominal: Rp ${actualFee})`,
    });

    return payment;
  }

  /**
   * Re-uploads payment proof when status is PAYMENT_REJECTED.
   */
  async reuploadPayment(
    userId: string,
    dto: ReuploadPaymentDto,
    fileBuffer: Buffer,
    originalFilename?: string,
  ) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: dto.registrationId },
      include: { classProgram: true, admissionWave: true },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran tidak ditemukan.');
    }

    if (reg.userId !== userId) {
      throw new ForbiddenException('Akses ditolak: Anda bukan pemilik pendaftaran ini.');
    }

    if (reg.status !== RegistrationStatus.PAYMENT_REJECTED) {
      throw new BadRequestException(
        'Upload ulang bukti hanya diperbolehkan untuk pendaftaran berstatus Pembayaran Ditolak (PAYMENT_REJECTED).',
      );
    }

    let accountId = dto.paymentAccountId;
    if (!accountId) {
      const prevPayment = await this.prisma.payment.findFirst({
        where: { registrationId: reg.id },
        orderBy: { createdAt: 'desc' },
      });
      accountId = prevPayment?.paymentAccountId || undefined;
    }

    const account = accountId
      ? await this.prisma.paymentAccount.findUnique({ where: { id: accountId } })
      : await this.prisma.paymentAccount.findFirst({ where: { isActive: true } });

    if (!account || !account.isActive) {
      throw new BadRequestException('Rekening bank pembayaran tidak valid.');
    }

    const validatedFile = FileValidatorUtil.validateImageBuffer(fileBuffer, originalFilename);
    const diskPath = path.join(this.uploadDir, validatedFile.storageFilename);
    await fs.promises.writeFile(diskPath, fileBuffer);

    // Dynamic fee from Admission Wave configuration (fallback to ClassProgram / default 500,000)
    const actualFee = reg.admissionWave?.registrationFee
      ? Number(reg.admissionWave.registrationFee)
      : (reg.classProgram?.registrationFee ? Number(reg.classProgram.registrationFee) : 500000.00);

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          registrationId: reg.id,
          paymentAccountId: account.id,
          amount: actualFee,
          proofImagePath: validatedFile.storageFilename,
          senderBank: dto.senderBank?.trim(),
          senderAccountName: dto.senderAccountName?.trim(),
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          status: PaymentStatus.WAITING_VERIFICATION,
          notes: `Re-upload: ${dto.notes?.trim() || '-'}`,
        },
      });

      await tx.registration.update({
        where: { id: reg.id },
        data: { status: RegistrationStatus.WAITING_VERIFICATION },
      });

      return p;
    });

    await this.auditService.log({
      userId,
      action: 'REUPLOAD_PAYMENT',
      targetTable: 'payments',
      targetId: payment.id,
      details: `Upload ulang bukti pembayaran untuk pendaftaran ${reg.registrationNumber}`,
    });

    return payment;
  }

  // --- Payment Verification ---

  async listPayments(status?: PaymentStatus, search?: string, page = 1, perPage = 25) {
    const skip = (page - 1) * perPage;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { senderAccountName: { contains: q, mode: 'insensitive' } },
        { senderBank: { contains: q, mode: 'insensitive' } },
        { registration: { registrationNumber: { contains: q, mode: 'insensitive' } } },
        {
          registration: {
            individualParticipant: { fullName: { contains: q, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          paymentAccount: true,
          registration: {
            include: {
              classProgram: { include: { major: { include: { school: true } } } },
              individualParticipant: true,
              team: true,
              user: { select: { id: true, name: true, email: true, phoneNumber: true } },
            },
          },
          verificationLogs: {
            include: { verifiedBy: { select: { id: true, name: true } } },
            orderBy: { verifiedAt: 'desc' },
          },
        },
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const formattedPayments = payments.map(p => {
      const reg = p.registration;
      const cp = reg?.classProgram;
      const major = cp?.major;
      const school = major?.school;
      const branchAlias = cp ? {
        ...cp,
        levelId: cp.majorId,
        level: major ? {
          ...major,
          categoryId: major.schoolId,
          category: school,
        } : null,
      } : null;

      return {
        ...p,
        registration: reg ? {
          ...reg,
          branchId: reg.classProgramId,
          branch: branchAlias,
          schoolName: school?.name || '',
          majorName: major?.name || '',
          classProgramName: cp?.name || '',
        } : null,
      };
    });

    return {
      payments: formattedPayments,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  /**
   * Approves payment atomically and unlocks full registration form.
   */
  async approvePayment(paymentId: string, staffId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { registration: true },
    });

    if (!payment) {
      throw new NotFoundException('Data pembayaran tidak ditemukan.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.APPROVED },
      });

      const currentReg = await tx.registration.findUnique({ where: { id: payment.registrationId } });
      const newFormStatus = currentReg?.formStatus === 'LOCKED' ? 'DRAFT' : currentReg?.formStatus;

      await tx.registration.update({
        where: { id: payment.registrationId },
        data: {
          status: RegistrationStatus.APPROVED,
          isFormUnlocked: true,
          formStatus: newFormStatus as any,
        },
      });

      await tx.paymentVerificationLog.create({
        data: {
          paymentId: payment.id,
          verifiedByUserId: staffId,
          action: VerificationAction.APPROVED,
          rejectionReason: null,
        },
      });

      return p;
    });

    await this.auditService.log({
      userId: staffId,
      action: 'APPROVE_PAYMENT',
      targetTable: 'payments',
      targetId: payment.id,
      details: `Persetujuan pembayaran pendaftaran ${payment.registration.registrationNumber} - Akses formulir lengkap TERBUKA`,
    });

    return updated;
  }

  /**
   * Rejects payment with mandatory reason.
   */
  async rejectPayment(paymentId: string, staffId: string, dto: RejectPaymentDto) {
    if (!dto.rejectionReason || !dto.rejectionReason.trim()) {
      throw new BadRequestException('Alasan penolakan pembayaran WAJIB diisi.');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { registration: true },
    });

    if (!payment) {
      throw new NotFoundException('Data pembayaran tidak ditemukan.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.REJECTED },
      });

      await tx.registration.update({
        where: { id: payment.registrationId },
        data: { status: RegistrationStatus.PAYMENT_REJECTED },
      });

      await tx.paymentVerificationLog.create({
        data: {
          paymentId: payment.id,
          verifiedByUserId: staffId,
          action: VerificationAction.REJECTED,
          rejectionReason: dto.rejectionReason.trim(),
        },
      });

      return p;
    });

    await this.auditService.log({
      userId: staffId,
      action: 'REJECT_PAYMENT',
      targetTable: 'payments',
      targetId: payment.id,
      details: `Penolakan pembayaran pendaftaran ${payment.registration.registrationNumber}. Alasan: ${dto.rejectionReason.trim()}`,
    });

    return updated;
  }

  // --- Protected File Streaming (IDOR Guard) ---

  /**
   * Authorizes and serves payment proof image file.
   * Rejects path traversal and unauthorized user access.
   */
  async getPaymentProofFile(filename: string, requesterUserId: string, requesterRole: Role) {
    const sanitized = FileValidatorUtil.sanitizeFilename(filename);

    const candidatePaths = [
      path.join(this.uploadDir, sanitized),
      path.resolve(process.cwd(), 'uploads/payment_proofs', sanitized),
      path.resolve(process.cwd(), '../uploads/payment_proofs', sanitized),
      path.resolve(process.cwd(), 'uploads', sanitized),
      path.resolve(process.cwd(), '../uploads', sanitized),
      path.resolve(process.cwd(), 'public/uploads/payment_proofs', sanitized),
    ];

    const filePath = candidatePaths.find((p) => fs.existsSync(p));

    if (!filePath) {
      throw new NotFoundException('File bukti pembayaran tidak ditemukan.');
    }

    // Verify ownership in database
    const payment = await this.prisma.payment.findFirst({
      where: { proofImagePath: sanitized },
      include: { registration: true },
    });

    // IDOR check: If role is PESERTA, user must be the registration owner
    if (payment && requesterRole === Role.PESERTA && payment.registration.userId !== requesterUserId) {
      throw new ForbiddenException('Akses ditolak: Anda tidak berhak mengakses bukti pembayaran ini.');
    }

    return {
      filePath,
      filename: sanitized,
    };
  }
}
