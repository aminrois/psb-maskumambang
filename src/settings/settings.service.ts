import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { UpdateSettingsDto, ResetOperationalDataDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async getSettings(): Promise<Record<string, string>> {
    const settings = await this.prisma.appSetting.findMany();
    const map: Record<string, string> = {
      application_name: 'PSB Maskumambang',
      application_short_name: 'PSB Maskumambang',
      application_description: 'Penerimaan Santri Baru (PSB) Pondok Pesantren Maskumambang',
      application_logo: 'logo_e7a8b6a95d.webp',
      application_favicon: 'favicon_87007b6344.webp',
      countdown_enabled: 'true',
      countdown_title: 'Hitung Mundur Penutupan Pendaftaran',
      countdown_target_date: '2026-10-15T23:59:00',
      countdown_ended_text: 'Pendaftaran Resmi Ditutup',
    };

    settings.forEach((s) => {
      if (s.value !== null && s.value !== undefined) {
        map[s.key] = s.value;
      }
    });

    return map;
  }

  async updateSettings(staffUserId: string, dto: UpdateSettingsDto) {
    const entries = Object.entries(dto).filter(([_, val]) => val !== undefined);

    for (const [key, value] of entries) {
      await this.prisma.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    await this.auditService.log({
      userId: staffUserId,
      action: 'UPDATE_SETTINGS',
      targetTable: 'app_settings',
      details: `Perubahan branding aplikasi: ${entries.map(([k, v]) => `${k}=${v}`).join(', ')}`,
    });

    return this.getSettings();
  }

  async uploadBrandingFile(staffUserId: string, file: Express.Multer.File, type: 'logo' | 'favicon') {
    if (!file || !file.buffer) {
      throw new BadRequestException('File tidak ditemukan.');
    }

    const ext = path.extname(file.originalname).toLowerCase().replace('.', '') || 'webp';
    const hash = crypto.randomBytes(5).toString('hex');
    const filename = `${type}_${hash}.${ext}`;

    const targetDirs = [
      path.resolve(process.cwd(), 'public/static/img'),
      path.resolve(process.cwd(), 'public/uploads/branding'),
      path.resolve(process.cwd(), 'uploads/branding'),
      path.resolve(process.cwd(), '../uploads/branding'),
    ];

    for (const dir of targetDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.join(dir, filename), file.buffer);
    }

    const settingKey = type === 'logo' ? 'application_logo' : 'application_favicon';
    await this.prisma.appSetting.upsert({
      where: { key: settingKey },
      update: { value: filename },
      create: { key: settingKey, value: filename },
    });

    await this.auditService.log({
      userId: staffUserId,
      action: `UPLOAD_${type.toUpperCase()}`,
      targetTable: 'app_settings',
      details: `Super Admin memperbarui ${type}: ${filename}`,
    });

    return {
      success: true,
      filename,
      url: `/static/img/${filename}`,
    };
  }

  async resetOperationalData(staffUserId: string, dto: ResetOperationalDataDto) {
    const validCode = this.configService.get<string>('reset.code') || 'RESET124';

    if (dto.confirmationCode.trim() !== validCode.trim()) {
      throw new ForbiddenException(
        'Kode konfirmasi reset tidak valid. Tindakan berbahaya ini dibatalkan.',
      );
    }

    // Atomic purge of operational tables and PESERTA user accounts while preserving master data & staff/admin accounts
    const stats = await this.prisma.$transaction(async (tx) => {
      const checkIns = await tx.checkIn.deleteMany({});
      const logs = await tx.paymentVerificationLog.deleteMany({});
      const payments = await tx.payment.deleteMany({});
      const teamMembers = await tx.teamMember.deleteMany({});
      const teams = await tx.team.deleteMany({});
      const indivs = await tx.individualParticipant.deleteMany({});
      const registrations = await tx.registration.deleteMany({});

      // Find all PESERTA user IDs
      const pesertaUsers = await tx.user.findMany({
        where: { role: 'PESERTA' as any },
        select: { id: true },
      });
      const pesertaIds = pesertaUsers.map((u) => u.id);

      if (pesertaIds.length > 0) {
        await tx.auditLog.deleteMany({
          where: { userId: { in: pesertaIds } },
        });
      }

      const deletedPeserta = await tx.user.deleteMany({
        where: { role: 'PESERTA' as any },
      });

      return {
        checkIns: checkIns.count,
        verificationLogs: logs.count,
        payments: payments.count,
        teamMembers: teamMembers.count,
        teams: teams.count,
        individualParticipants: indivs.count,
        registrations: registrations.count,
        deletedPesertaUsers: deletedPeserta.count,
      };
    });

    await this.auditService.log({
      userId: staffUserId,
      action: 'RESET_OPERATIONAL_DATA',
      targetTable: 'system',
      details: `Super Admin melakukan reset data operasional lomba: ${stats.registrations} registrasi, ${stats.payments} pembayaran, dan ${stats.deletedPesertaUsers} akun peserta dibersihkan.`,
    });

    return {
      success: true,
      message: `Seluruh data transaksi (${stats.registrations} pendaftaran) dan ${stats.deletedPesertaUsers} akun peserta berhasil dibersihkan. Akun admin dan master data lomba tetap aman.`,
      stats,
    };
  }
}
