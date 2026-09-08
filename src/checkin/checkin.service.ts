import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { QrEngineUtil } from '../common/utils/qr-engine.util';
import { ScanCheckInDto } from './dto/checkin.dto';
import { CheckInMethod, RegistrationStatus } from '@prisma/client';

@Injectable()
export class CheckInService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Processes event-day check-in via QR Scanner or Manual Code.
   * Concurrency-safe atomic duplicate prevention with audit logging.
   */
  async processCheckIn(staffUserId: string, dto: ScanCheckInDto) {
    const cleaned = dto.token.trim();
    const salt = this.configService.get<string>('qr.salt') || 'default_salt';

    // 1. Locate registration by qr_code_token OR registration_number
    const reg = await this.prisma.registration.findFirst({
      where: {
        OR: [
          { qrCodeToken: cleaned },
          { registrationNumber: { equals: cleaned, mode: 'insensitive' } },
        ],
      },
      include: {
        classProgram: {
          include: {
            major: {
              include: {
                school: true,
              },
            },
          },
        },
        individualParticipant: true,
        team: true,
        checkIn: {
          include: {
            checkedInBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!reg) {
      return {
        success: false,
        message: 'Data pendaftaran atau QR Code tidak ditemukan dalam sistem.',
        data: null,
        already_checked_in: false,
      };
    }

    // 2. Check approval status
    if (reg.status !== RegistrationStatus.APPROVED) {
      return {
        success: false,
        message: `Pendaftaran ini belum disetujui panitia/bendahara. Status saat ini: ${reg.status}.`,
        data: null,
        already_checked_in: false,
      };
    }

    // 3. Anti-tamper QR HMAC verification
    if (dto.method === CheckInMethod.QR_SCAN && cleaned.startsWith('REGQR_')) {
      const isValidHmac = QrEngineUtil.verifyToken(
        cleaned,
        reg.id,
        reg.registrationNumber,
        salt,
      );

      if (!isValidHmac) {
        await this.auditService.log({
          userId: staffUserId,
          action: 'TAMPERED_QR_SCAN_ATTEMPT',
          targetTable: 'registrations',
          targetId: reg.id,
          details: `Percobaan check-in dengan QR palsu / tampered token: ${cleaned}`,
        });

        return {
          success: false,
          message: 'QR Code tidak valid atau tanda tangan digital telah dimanipulasi.',
          data: null,
          already_checked_in: false,
        };
      }
    }

    // 4. Duplicate Check-in Prevention (Atomic check)
    if (reg.checkIn) {
      await this.auditService.log({
        userId: staffUserId,
        action: 'DUPLICATE_CHECK_IN_ATTEMPT',
        targetTable: 'check_ins',
        targetId: reg.checkIn.id,
        details: `Percobaan check-in duplikat untuk ${reg.registrationNumber}`,
      });

      return {
        success: false,
        message: `Peserta sudah pernah melakukan check-in sebelumnya pada ${reg.checkIn.checkInTime.toISOString()} oleh petugas ${reg.checkIn.checkedInBy.name}.`,
        data: {
          registration_number: reg.registrationNumber,
          participant_name:
            reg.individualParticipant?.fullName || reg.team?.teamName || 'Peserta',
          school_name:
            reg.individualParticipant?.schoolName || reg.team?.schoolName || '-',
          branch_name: reg.classProgram?.name || '-',
        },
        already_checked_in: true,
        previous_time: reg.checkIn.checkInTime.toISOString(),
        previous_staff: reg.checkIn.checkedInBy.name,
      };
    }

    // 5. Atomic check-in recording (Protected against race conditions via unique constraint)
    try {
      const checkInRecord = await this.prisma.checkIn.create({
        data: {
          registrationId: reg.id,
          checkedInByUserId: staffUserId,
          checkInMethod: dto.method,
          notes: dto.notes?.trim() || `Check-in berhasil via ${dto.method}`,
        },
        include: {
          checkedInBy: {
            select: { name: true },
          },
        },
      });

      await this.auditService.log({
        userId: staffUserId,
        action: 'CHECK_IN_SUCCESS',
        targetTable: 'check_ins',
        targetId: checkInRecord.id,
        details: `Check-in berhasil (${dto.method}) untuk ${reg.registrationNumber}`,
      });

      const school = reg.classProgram?.major?.school;
      const major = reg.classProgram?.major;
      const cp = reg.classProgram;

      return {
        success: true,
        message: `Check-in BERHASIL untuk pendaftaran ${reg.registrationNumber}!`,
        data: {
          registration_number: reg.registrationNumber,
          participant_name:
            reg.individualParticipant?.fullName || reg.team?.teamName || 'Calon Siswa',
          school_name:
            reg.individualParticipant?.schoolName || reg.team?.schoolName || '-',
          target_school_name: school?.name || '-',
          target_major_name: major?.name || '-',
          target_class_program_name: cp?.name || '-',
          category_name: school?.name || '-',
          level_name: major?.name || '-',
          branch_name: cp?.name || '-',
          participant_type: cp?.participantType || 'INDIVIDUAL',
          check_in_time: checkInRecord.checkInTime.toISOString(),
          checked_in_by: checkInRecord.checkedInBy.name,
          method: checkInRecord.checkInMethod,
        },
        already_checked_in: false,
      };
    } catch (error: any) {
      // Handle race condition where another concurrent request checked in simultaneously
      if (error?.code === 'P2002') {
        return {
          success: false,
          message: 'Peserta sudah pernah melakukan check-in pada sesi bersamaan.',
          already_checked_in: true,
        };
      }
      throw error;
    }
  }

  /**
   * Processes Stage-2 check-in (masuk arena lomba/sekolah).
   * Requires Stage-1 already done. Uses same QR/manual token.
   */
  async processCheckIn2(staffUserId: string, dto: ScanCheckInDto) {
    const cleaned = dto.token.trim();
    const salt = this.configService.get<string>('qr.salt') || 'default_salt';

    const reg = await this.prisma.registration.findFirst({
      where: {
        OR: [
          { qrCodeToken: cleaned },
          { registrationNumber: { equals: cleaned, mode: 'insensitive' } },
        ],
      },
      include: {
        classProgram: { include: { major: { include: { school: true } } } },
        individualParticipant: true,
        team: true,
        checkIn: { include: { checkedInBy: { select: { id: true, name: true } } } },
      },
    });

    if (!reg) {
      return { success: false, message: 'Data pendaftaran tidak ditemukan.', data: null };
    }

    if (reg.status !== RegistrationStatus.APPROVED) {
      return {
        success: false,
        message: `Pendaftaran belum disetujui. Status: ${reg.status}.`,
        data: null,
      };
    }

    // Must have completed Stage 1 first
    if (!reg.checkIn) {
      return {
        success: false,
        message: 'Peserta belum melakukan Check-In Tahap 1 (Kedatangan). Selesaikan dahulu.',
        data: null,
      };
    }

    // Already done Stage 2?
    if (reg.checkIn.checkIn2Time) {
      return {
        success: false,
        message: `Peserta sudah masuk pada ${reg.checkIn.checkIn2Time.toISOString()}.`,
        data: {
          registration_number: reg.registrationNumber,
          participant_name: reg.individualParticipant?.fullName || reg.team?.teamName || 'Calon Siswa',
          branch_name: reg.classProgram?.name || '-',
        },
        already_checked_in: true,
      };
    }

    // Anti-tamper verification for QR
    if (dto.method === CheckInMethod.QR_SCAN && cleaned.startsWith('REGQR_')) {
      const isValid = QrEngineUtil.verifyToken(cleaned, reg.id, reg.registrationNumber, salt);
      if (!isValid) {
        return { success: false, message: 'QR Code tidak valid atau telah dimanipulasi.', data: null };
      }
    }

    // Record Stage 2
    const updated = await this.prisma.checkIn.update({
      where: { registrationId: reg.id },
      data: {
        checkIn2Time: new Date(),
        checkIn2ByUserId: staffUserId,
        checkIn2Method: dto.method,
        notes2: dto.notes?.trim() || `Masuk via ${dto.method}`,
      },
      include: { checkedInBy2: { select: { name: true } } },
    });

    await this.auditService.log({
      userId: staffUserId,
      action: 'CHECK_IN_2_SUCCESS',
      targetTable: 'check_ins',
      targetId: updated.id,
      details: `Check-In Tahap 2 berhasil untuk ${reg.registrationNumber}`,
    });

    const school = reg.classProgram?.major?.school;
    const major = reg.classProgram?.major;
    const cp = reg.classProgram;

    return {
      success: true,
      message: `Check-In Tahap 2 BERHASIL untuk ${reg.registrationNumber}!`,
      data: {
        registration_number: reg.registrationNumber,
        participant_name: reg.individualParticipant?.fullName || reg.team?.teamName || 'Calon Siswa',
        school_name: reg.individualParticipant?.schoolName || reg.team?.schoolName || '-',
        category_name: school?.name || '-',
        level_name: major?.name || '-',
        branch_name: cp?.name || '-',
        check_in_2_time: updated.checkIn2Time!.toISOString(),
        checked_in_by: updated.checkedInBy2?.name || '-',
        stage: 2,
      },
      already_checked_in: false,
    };
  }

  /**
   * Retrieves recent check-in live log (both stages).
   */
  async getLiveCheckInLogs(limit = 50) {
    const records = await this.prisma.checkIn.findMany({
      take: limit,
      orderBy: { checkInTime: 'desc' },
      include: {
        checkedInBy: { select: { name: true } },
        checkedInBy2: { select: { name: true } },
        registration: {
          include: {
            classProgram: {
              include: { major: { include: { school: true } } },
            },
            individualParticipant: true,
            team: true,
          },
        },
      },
    });

    return records.map((r) => ({
      id: r.id,
      registration_number: r.registration.registrationNumber,
      participant_name:
        r.registration.individualParticipant?.fullName ||
        r.registration.team?.teamName ||
        'Calon Siswa',
      school_name:
        r.registration.individualParticipant?.schoolName ||
        r.registration.team?.schoolName ||
        '-',
      branch_name: r.registration.classProgram?.name || '-',
      // Stage 1
      check_in_time: r.checkInTime.toISOString(),
      checked_in_by_name: r.checkedInBy.name,
      check_in_method: r.checkInMethod,
      // Stage 2
      check_in_2_time: r.checkIn2Time?.toISOString() || null,
      checked_in_2_by_name: r.checkedInBy2?.name || null,
      check_in_2_method: r.checkIn2Method || null,
    }));
  }
}

