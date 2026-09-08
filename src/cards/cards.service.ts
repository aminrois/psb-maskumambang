import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QrEngineUtil } from '../common/utils/qr-engine.util';
import { FormStatus, RegistrationStatus, Role } from '@prisma/client';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates official participant ID card payload and QR code.
   * Enforces: Card is active only AFTER data verification by admin (formStatus === VERIFIED).
   * IDOR ownership check for PESERTA role.
   */
  async getParticipantCard(registrationId: string, requesterUserId: string, requesterRole: Role) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: registrationId },
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
        studentDetail: true,
        academicPeriod: true,
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        team: {
          include: {
            members: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran tidak ditemukan.');
    }

    // IDOR Protection: Peserta can only access their own card
    if (requesterRole === Role.PESERTA && reg.userId !== requesterUserId) {
      throw new ForbiddenException('Akses ditolak: Anda tidak memiliki izin melihat data ini.');
    }

    // Must be approved payment
    if (reg.status !== RegistrationStatus.APPROVED) {
      throw new BadRequestException(
        `Kartu peserta belum aktif. Pembayaran pendaftaran belum diverifikasi oleh panitia.`,
      );
    }

    // REQUIREMENT: Kartu peserta aktif setelah verifikasi data berhasil dilakukan oleh admin
    if (requesterRole === Role.PESERTA && reg.formStatus !== FormStatus.VERIFIED) {
      throw new BadRequestException(
        'Kartu Peserta Seleksi belum aktif. Kartu peserta akan aktif secara otomatis setelah data formulir dan berkas Anda selesai diverifikasi dan disetujui oleh Panitia PSB.',
      );
    }

    // Generate Base64 QR Code image from secure qrCodeToken (auto-generate if missing)
    let qrToken = reg.qrCodeToken;
    if (!qrToken || typeof qrToken !== 'string' || qrToken.trim() === '') {
      const salt = process.env.QR_SALT || 'psb2_secure_qr_salt_2026';
      qrToken = QrEngineUtil.generateToken(reg.id, reg.registrationNumber, salt);
      await this.prisma.registration.update({
        where: { id: reg.id },
        data: { qrCodeToken: qrToken },
      });
    }

    let qrDataUri = '';
    try {
      qrDataUri = await QrEngineUtil.generateQrDataUri(qrToken);
    } catch (err) {
      qrDataUri = await QrEngineUtil.generateQrDataUri(reg.registrationNumber || reg.id);
    }

    // Fetch branding settings
    const settings = await this.prisma.appSetting.findMany();
    const brandingMap: Record<string, string> = {};
    settings.forEach((s) => {
      if (s.value) brandingMap[s.key] = s.value;
    });

    // Resolve Active Period Year if not directly linked
    let academicPeriodName = reg.academicPeriod?.name;
    if (!academicPeriodName) {
      const activePeriod = await this.prisma.academicPeriod.findFirst({
        where: { isActive: true },
      });
      academicPeriodName = activePeriod?.name || '2026/2027';
    }

    // Find student photo if uploaded (check PHOTO doc type or image files)
    const photoDoc = reg.documents?.find(
      (d) => d.documentType === 'PHOTO' || (d.mimeType && d.mimeType.startsWith('image/')),
    );
    const photoUrl = photoDoc
      ? `/api/registrations/${reg.id}/documents/${photoDoc.id}/file`
      : null;

    const studentName =
      reg.studentDetail?.fullName ||
      reg.individualParticipant?.fullName ||
      reg.team?.teamName ||
      'Calon Santri';

    const school = reg.classProgram?.major?.school;
    const major = reg.classProgram?.major;
    const cp = reg.classProgram;

    const boardingLabel =
      reg.boardingStatus === 'NON_MUKIM' ? 'Non-Mukim' : 'Mukim / Mondok';

    const appName = brandingMap['application_name'] || 'PSB Maskumambang';
    const rawLogo = brandingMap['application_logo'] || 'logo_e7a8b6a95d.webp';
    const appLogo = (rawLogo.startsWith('http://') || rawLogo.startsWith('https://') || rawLogo.startsWith('/'))
      ? rawLogo
      : `/static/img/${rawLogo}`;

    return {
      registration_number: reg.registrationNumber,
      participant_name: studentName,
      full_name: studentName,
      target_school_name: school?.name || '-',
      target_major_name: major?.name || '-',
      target_class_program_name: cp?.name || '-',
      school_name: school?.name || '-',
      major_name: major?.name || '-',
      class_program_name: cp?.name || '-',
      boarding_status: reg.boardingStatus,
      boarding_status_label: boardingLabel,
      academic_period_name: academicPeriodName,
      photo_url: photoUrl,
      qr_data_uri: qrDataUri,
      qr_code_token: reg.qrCodeToken,
      status: reg.status,
      form_status: reg.formStatus,
      is_form_unlocked: reg.isFormUnlocked,
      app_name: appName,
      app_title: appName,
      app_short_name: brandingMap['application_short_name'] || appName,
      logo_url: appLogo,
    };
  }
}
