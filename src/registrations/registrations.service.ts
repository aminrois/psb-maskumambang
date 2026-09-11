import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { CreateIndividualRegistrationDto } from './dto/create-individual.dto';
import { CreateTeamRegistrationDto } from './dto/create-team.dto';
import { SaveFormDraftDto, SubmitFullFormDto, RequestRevisionDto, AchievementItemDto } from './dto/full-form.dto';
import { FileValidatorUtil } from '../common/utils/file-validator.util';
import {
  BoardingStatus,
  CBTAttemptStatus,
  DocumentType,
  FormStatus,
  InterviewStatus,
  ParticipantType,
  PaymentStatus,
  RegistrationStatus,
  Role,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RegistrationsService {
  private readonly docsDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    const baseUpload = this.configService.get<string>('upload.folder') || 'uploads';
    this.docsDir = path.resolve(process.cwd(), baseUpload, 'documents');
    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
    }
  }

  /**
   * Generates formatted registration number for PSB:
   * PSB-SEKOLAH-PERIODETAHUN-NOMORPENDAFTARAN
   * Contoh: PSB-MA-26-246A91
   * SEKOLAH diambil dari field 'initial' sekolah (jika ada), atau kata pertama nama sekolah.
   */
  private generateRegistrationNumber(schoolName?: string, periodName?: string, schoolInitial?: string): string {
    let schoolCode = 'PSB';
    if (schoolInitial) {
      schoolCode = schoolInitial.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || schoolCode;
    } else if (schoolName) {
      const firstWord = schoolName.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (firstWord) {
        schoolCode = firstWord;
      }
    }

    let yearCode = new Date().getFullYear().toString().slice(-2);
    if (periodName) {
      const match4 = periodName.match(/\d{4}/);
      if (match4) {
        yearCode = match4[0].slice(-2);
      } else {
        const match2 = periodName.match(/\d{2}/);
        if (match2) {
          yearCode = match2[0];
        }
      }
    }

    const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PSB-${schoolCode}-${yearCode}-${hex}`;
  }

  /**
   * Generates secure QR token with HMAC signature matching reference implementation.
   */
  private generateQrToken(regId: string, regNumber: string): string {
    const salt = this.configService.get<string>('qr.salt') || 'default_salt';
    const uuidShort = regId.replace(/-/g, '').slice(0, 8);
    const regHex = Buffer.from(regNumber).toString('hex');
    const hmac = crypto
      .createHmac('sha256', salt)
      .update(`${regId}:${regNumber}`)
      .digest('hex');

    return `REGQR_${uuidShort}_${regHex}_${hmac}`;
  }

  /**
   * Submits PSB Initial Registration (Calon Siswa) with Academic Period, Admission Wave, and Boarding Status.
   */
  async createIndividual(userId: string, dto: CreateIndividualRegistrationDto) {
    // 1 User Account = 1 Registration check
    const existingReg = await this.prisma.registration.findFirst({
      where: { userId },
    });
    if (existingReg) {
      throw new BadRequestException('Setiap akun hanya dapat digunakan untuk mendaftarkan satu calon siswa.');
    }

    const targetCpId = dto.classProgramId || dto.branchId;
    if (!targetCpId) {
      throw new BadRequestException('Pilihan Program Kelas (classProgramId) wajib diisi.');
    }

    const classProgram = await this.prisma.classProgram.findUnique({
      where: { id: targetCpId },
      include: { major: { include: { school: true } } },
    });

    if (!classProgram) {
      throw new NotFoundException('Program kelas tidak ditemukan.');
    }

    if (!classProgram.isActive) {
      throw new BadRequestException('Program kelas yang dipilih sedang tidak aktif.');
    }

    // Resolve Academic Period
    let periodId = dto.academicPeriodId || dto.periodId;
    if (!periodId) {
      const activePeriod = await this.prisma.academicPeriod.findFirst({
        where: { isActive: true },
      });
      if (activePeriod) {
        periodId = activePeriod.id;
      }
    } else {
      const p = await this.prisma.academicPeriod.findUnique({ where: { id: periodId } });
      if (!p || !p.isActive) {
        throw new BadRequestException('Periode tahun pelajaran tidak aktif atau tidak ditemukan.');
      }
    }

    // Resolve Admission Wave
    let waveId = dto.admissionWaveId || dto.waveId;
    const now = new Date();
    const schoolId = classProgram.major.school.id;
    const schoolName = classProgram.major.school.name;

    // Helper to check if a wave has remaining quota for this registration
    const checkWaveAvailability = async (w: any): Promise<boolean> => {
      // Check school-specific quota
      const schoolQuota = (w.schoolQuotas || []).find((sq: any) => sq.schoolId === schoolId);
      if (schoolQuota && schoolQuota.quota > 0) {
        const verifiedSchoolCount = await this.prisma.registration.count({
          where: {
            admissionWaveId: w.id,
            classProgram: { major: { schoolId } },
            payments: { some: { status: PaymentStatus.APPROVED } },
          },
        });
        if (verifiedSchoolCount >= schoolQuota.quota) return false;
      }

      // Check overall wave quota
      if (w.quota !== null && w.quota !== undefined && w.quota > 0) {
        const verifiedCount = await this.prisma.registration.count({
          where: {
            admissionWaveId: w.id,
            payments: { some: { status: PaymentStatus.APPROVED } },
          },
        });
        if (verifiedCount >= w.quota) return false;
      }

      return true;
    };

    if (waveId) {
      const w = await this.prisma.admissionWave.findUnique({
        where: { id: waveId },
        include: { schoolQuotas: true },
      });
      if (!w || !w.isActive) {
        throw new BadRequestException('Gelombang pendaftaran yang dipilih sedang tidak aktif.');
      }

      const isAvailable = await checkWaveAvailability(w);

      if (!isAvailable) {
        // Auto-advance: find the next active wave in the same period that has quota (even if startDate is upcoming)
        const allActiveWaves = await this.prisma.admissionWave.findMany({
          where: {
            academicPeriodId: w.academicPeriodId,
            isActive: true,
            id: { not: waveId },
          },
          include: { schoolQuotas: true },
          orderBy: [{ waveNumber: 'asc' }, { startDate: 'asc' }],
        });

        let nextWave: any = null;
        for (const candidate of allActiveWaves) {
          if (await checkWaveAvailability(candidate)) {
            nextWave = candidate;
            break;
          }
        }

        if (!nextWave) {
          throw new BadRequestException(
            `Kuota pendaftaran untuk ${schoolName} sudah terpenuhi di semua kuota/gelombang yang aktif. Silakan hubungi panitia.`,
          );
        }
        waveId = nextWave.id;
      }

      if (periodId && w.academicPeriodId !== periodId) {
        periodId = w.academicPeriodId;
      }
    } else if (periodId) {
      // Find active waves in period and pick the first with available quota
      const allActiveWaves = await this.prisma.admissionWave.findMany({
        where: {
          academicPeriodId: periodId,
          isActive: true,
        },
        include: { schoolQuotas: true },
        orderBy: [{ waveNumber: 'asc' }, { startDate: 'asc' }],
      });

      for (const candidate of allActiveWaves) {
        if (await checkWaveAvailability(candidate)) {
          waveId = candidate.id;
          break;
        }
      }
    }

    // Boarding status
    let boardingStatus: BoardingStatus = BoardingStatus.MUKIM;
    if (dto.boardingStatus) {
      boardingStatus = dto.boardingStatus;
    } else if (dto.mukimStatus === 'NON_MUKIM') {
      boardingStatus = BoardingStatus.NON_MUKIM;
    }

    let periodName: string | undefined;
    if (periodId) {
      const pRec = await this.prisma.academicPeriod.findUnique({ where: { id: periodId } });
      periodName = pRec?.name;
    }
    const schoolInitial = classProgram.major?.school?.initial ?? undefined;

    const regId = crypto.randomUUID();
    const regNumber = this.generateRegistrationNumber(schoolName, periodName, schoolInitial);
    const qrToken = this.generateQrToken(regId, regNumber);

    // Atomic transaction
    const registration = await this.prisma.$transaction(async (tx) => {
      const reg = await tx.registration.create({
        data: {
          id: regId,
          registrationNumber: regNumber,
          userId,
          classProgramId: targetCpId,
          academicPeriodId: periodId || null,
          admissionWaveId: waveId || null,
          boardingStatus,
          status: RegistrationStatus.WAITING_VERIFICATION,
          isFormUnlocked: false,
          formStatus: FormStatus.LOCKED,
          qrCodeToken: qrToken,
        },
      });

      await tx.individualParticipant.create({
        data: {
          registrationId: reg.id,
          fullName: dto.fullName.trim(),
          gender: dto.gender || 'L',
          gradeClass: dto.gradeClass ? dto.gradeClass.trim() : null,
          schoolName: dto.schoolName ? dto.schoolName.trim() : null,
          schoolAddress: dto.schoolAddress ? dto.schoolAddress.trim() : null,
          mentorName: dto.mentorName ? dto.mentorName.trim() : null,
          whatsappNumber: dto.whatsappNumber ? dto.whatsappNumber.trim() : null,
        },
      });

      // Initialize default studentDetail
      await tx.studentDetail.create({
        data: {
          registrationId: reg.id,
          fullName: dto.fullName.trim(),
          gender: dto.gender || 'L',
          previousSchoolName: dto.schoolName ? dto.schoolName.trim() : null,
          previousSchoolAddress: dto.schoolAddress ? dto.schoolAddress.trim() : null,
          primaryContactName: dto.mentorName ? dto.mentorName.trim() : null,
          primaryContactWhatsapp: dto.whatsappNumber ? dto.whatsappNumber.trim() : null,
        },
      });

      return reg;
    });

    await this.auditService.log({
      userId,
      action: 'CREATE_REGISTRATION',
      targetTable: 'registrations',
      targetId: registration.id,
      details: `Pendaftaran PSB awal: ${regNumber} (${dto.fullName} - ${classProgram.name} ${classProgram.major.name} ${classProgram.major.school.name})`,
    });

    return this.getRegistrationById(registration.id, userId, Role.PESERTA);
  }

  /**
   * Submits Team Registration with dynamic members (legacy compatibility).
   */
  async createTeam(userId: string, dto: CreateTeamRegistrationDto) {
    // 1 User Account = 1 Registration check
    const existingReg = await this.prisma.registration.findFirst({
      where: { userId },
    });
    if (existingReg) {
      throw new BadRequestException('Setiap akun hanya dapat digunakan untuk mendaftarkan satu calon siswa.');
    }

    const targetCpId = dto.branchId;
    const classProgram = await this.prisma.classProgram.findUnique({
      where: { id: targetCpId },
      include: { major: { include: { school: true } } },
    });

    if (!classProgram) {
      throw new NotFoundException('Program kelas tidak ditemukan.');
    }

    const schoolName = classProgram.major?.school?.name;
    const regId = crypto.randomUUID();
    const teamId = crypto.randomUUID();
    const regNumber = this.generateRegistrationNumber(schoolName);
    const qrToken = this.generateQrToken(regId, regNumber);

    const registration = await this.prisma.$transaction(async (tx) => {
      const reg = await tx.registration.create({
        data: {
          id: regId,
          registrationNumber: regNumber,
          userId,
          classProgramId: targetCpId,
          status: RegistrationStatus.WAITING_VERIFICATION,
          isFormUnlocked: false,
          formStatus: FormStatus.LOCKED,
          qrCodeToken: qrToken,
        },
      });

      const team = await tx.team.create({
        data: {
          id: teamId,
          registrationId: reg.id,
          teamName: dto.teamName.trim(),
          schoolName: dto.schoolName.trim(),
          schoolAddress: dto.schoolAddress.trim(),
          mentorName: dto.mentorName.trim(),
          whatsappNumber: dto.whatsappNumber.trim(),
          leaderName: dto.leaderName.trim(),
        },
      });

      if (dto.members && dto.members.length > 0) {
        await tx.teamMember.createMany({
          data: dto.members.map((mem) => ({
            teamId: team.id,
            memberName: mem.memberName.trim(),
            gender: mem.gender,
            gradeClass: mem.gradeClass.trim(),
            positionRole: mem.positionRole ? mem.positionRole.trim() : 'Anggota',
          })),
        });
      }

      return reg;
    });

    return this.getRegistrationById(registration.id, userId, Role.PESERTA);
  }

  /**
   * Form Gate: Checks if candidate is authorized to access / submit full application form.
   * Throws ForbiddenException if payment is not APPROVED.
   */
  async checkFullFormAccess(regId: string, userId: string, role: Role) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: regId },
      include: {
        payments: {
          where: { status: 'APPROVED' },
        },
      },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran tidak ditemukan.');
    }

    if (role === Role.PESERTA && reg.userId !== userId) {
      throw new ForbiddenException('Akses ditolak: Anda bukan pemilik data pendaftaran ini.');
    }

    const isUnlocked = reg.isFormUnlocked || reg.status === RegistrationStatus.APPROVED || reg.payments.length > 0;

    if (!isUnlocked) {
      throw new ForbiddenException(
        'Akses Formulir Lengkap Terkunci. Pembayaran biaya formulir harus diverifikasi dan disetujui (APPROVED) terlebih dahulu. Mohon menunggu',
      );
    }

    return {
      success: true,
      canAccessForm: true,
      unlocked: true,
      isFormUnlocked: true,
      registrationId: reg.id,
      registrationNumber: reg.registrationNumber,
      status: reg.status,
      formStatus: reg.formStatus,
      message: 'Akses formulir pendaftaran lengkap TERBUKA. Silakan lengkapi formulir.',
      data: {
        canAccessForm: true,
        unlocked: true,
        isFormUnlocked: true,
        registrationId: reg.id,
        registrationNumber: reg.registrationNumber,
        status: reg.status,
        formStatus: reg.formStatus,
        message: 'Akses formulir pendaftaran lengkap TERBUKA. Silakan lengkapi formulir.',
      },
    };
  }

  /**
   * Retrieves Full Application Form data (Candidate info, Achievements, Documents, Form Status).
   */
  async getRegistrationForm(regId: string, userId: string, role: Role) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: regId },
      include: {
        academicPeriod: true,
        admissionWave: true,
        classProgram: {
          include: { major: { include: { school: true } } },
        },
        studentDetail: true,
        achievements: { orderBy: { createdAt: 'asc' } },
        documents: { orderBy: { uploadedAt: 'asc' } },
        individualParticipant: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran tidak ditemukan.');
    }

    if (role === Role.PESERTA && reg.userId !== userId) {
      throw new ForbiddenException('Akses ditolak: Anda bukan pemilik data pendaftaran ini.');
    }

    const isUnlocked = reg.isFormUnlocked || reg.status === RegistrationStatus.APPROVED;
    if (role === Role.PESERTA && !isUnlocked) {
      throw new ForbiddenException(
        'Akses formulir masih terkunci. Pembayaran biaya pendaftaran harus disetujui oleh Bendahara terlebih dahulu.',
      );
    }

    return {
      success: true,
      data: {
        ...this.formatRegistrationResponse(reg),
        studentDetail: reg.studentDetail || {},
        achievements: reg.achievements || [],
        documents: reg.documents || [],
        formStatus: reg.formStatus,
        revisionNotes: reg.revisionNotes,
      },
    };
  }

  /**
   * Saves Form Data as Draft (Partial data permitted, no strict field validation).
   */
  async saveFormDraft(regId: string, userId: string, role: Role, dto: SaveFormDraftDto) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: regId },
      include: { studentDetail: true },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran tidak ditemukan.');
    }

    if (role === Role.PESERTA && reg.userId !== userId) {
      throw new ForbiddenException('Akses ditolak: Anda bukan pemilik data pendaftaran ini.');
    }

    if (role === Role.PESERTA && (reg.formStatus === FormStatus.SUBMITTED || reg.formStatus === FormStatus.VERIFIED)) {
      throw new BadRequestException(
        `Formulir dengan status ${reg.formStatus} tidak dapat diedit kembali kecuali diminta revisi oleh Super Admin.`,
      );
    }

    const birthDate = dto.birthDate ? new Date(dto.birthDate) : undefined;
    const fatherBirthDate = dto.fatherBirthDate ? new Date(dto.fatherBirthDate) : undefined;
    const motherBirthDate = dto.motherBirthDate ? new Date(dto.motherBirthDate) : undefined;
    const guardianBirthDate = dto.guardianBirthDate ? new Date(dto.guardianBirthDate) : undefined;

    const dataToSave: any = {
      ...dto,
      birthDate: birthDate && !isNaN(birthDate.getTime()) ? birthDate : undefined,
      fatherBirthDate: fatherBirthDate && !isNaN(fatherBirthDate.getTime()) ? fatherBirthDate : undefined,
      motherBirthDate: motherBirthDate && !isNaN(motherBirthDate.getTime()) ? motherBirthDate : undefined,
      guardianBirthDate: guardianBirthDate && !isNaN(guardianBirthDate.getTime()) ? guardianBirthDate : undefined,
      achievements: undefined, // Handled separately
    };

    // Remove undefined keys
    Object.keys(dataToSave).forEach(key => dataToSave[key] === undefined && delete dataToSave[key]);

    await this.prisma.$transaction(async (tx) => {
      // Upsert studentDetail
      await tx.studentDetail.upsert({
        where: { registrationId: regId },
        update: dataToSave,
        create: {
          registrationId: regId,
          ...dataToSave,
        },
      });

      // Update IndividualParticipant summary if name provided
      if (dto.fullName) {
        await tx.individualParticipant.updateMany({
          where: { registrationId: regId },
          data: {
            fullName: dto.fullName.trim(),
            gender: dto.gender || undefined,
            schoolName: dto.previousSchoolName ? dto.previousSchoolName.trim() : undefined,
          },
        });
      }

      // Sync achievements if provided in draft
      if (Array.isArray(dto.achievements)) {
        await tx.studentAchievement.deleteMany({ where: { registrationId: regId } });
        if (dto.achievements.length > 0) {
          await tx.studentAchievement.createMany({
            data: dto.achievements.map((ach) => ({
              registrationId: regId,
              name: ach.name.trim(),
              type: ach.type.trim(),
              level: ach.level.trim(),
              year: ach.year.trim(),
              rank: ach.rank.trim(),
            })),
          });
        }
      }

      // If formStatus was LOCKED, update to DRAFT
      if (reg.formStatus === FormStatus.LOCKED) {
        await tx.registration.update({
          where: { id: regId },
          data: { formStatus: FormStatus.DRAFT },
        });
      }
    });

    await this.auditService.log({
      userId,
      action: 'SAVE_FORM_DRAFT',
      targetTable: 'registrations',
      targetId: regId,
      details: `Simpan draft formulir pendaftaran: ${reg.registrationNumber}`,
    });

    return {
      success: true,
      message: 'Draft formulir pendaftaran berhasil disimpan.',
      data: {
        registrationId: regId,
        formStatus: reg.formStatus === FormStatus.LOCKED ? FormStatus.DRAFT : reg.formStatus,
      },
    };
  }

  /**
   * Final Submission of Full Application Form (Strict validation across all required and conditional fields).
   */
  async submitFullForm(regId: string, userId: string, role: Role, dto: SubmitFullFormDto) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: regId },
      include: {
        studentDetail: true,
        documents: true,
        achievements: true,
      },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran tidak ditemukan.');
    }

    if (role === Role.PESERTA && reg.userId !== userId) {
      throw new ForbiddenException('Akses ditolak: Anda bukan pemilik data pendaftaran ini.');
    }

    if (role === Role.PESERTA && (reg.formStatus === FormStatus.SUBMITTED || reg.formStatus === FormStatus.VERIFIED)) {
      throw new BadRequestException(
        `Formulir sudah berada pada status ${reg.formStatus} dan tidak dapat dikirim ulang.`,
      );
    }

    // Merge incoming DTO with existing studentDetail in DB
    const merged: any = {
      ...(reg.studentDetail || {}),
      ...dto,
    };

    // 1. Strict Validation: Identitas Calon Santri
    if (!merged.fullName?.trim()) throw new BadRequestException('Nama Lengkap calon santri wajib diisi.');
    if (!merged.nik?.trim()) throw new BadRequestException('NIK calon santri wajib diisi.');
    if (!merged.familyCardNumber?.trim()) throw new BadRequestException('Nomor Kartu Keluarga (KK) wajib diisi.');
    if (!merged.nisn?.trim()) throw new BadRequestException('NISN calon santri wajib diisi.');
    if (!merged.birthCertificateNumber?.trim()) throw new BadRequestException('Nomor Akta Kelahiran wajib diisi.');
    if (!merged.gender) throw new BadRequestException('Jenis Kelamin calon santri wajib dipilih.');
    if (!merged.birthPlace?.trim()) throw new BadRequestException('Tempat Lahir calon santri wajib diisi.');
    if (!merged.birthDate) throw new BadRequestException('Tanggal Lahir calon santri wajib diisi.');
    if (!merged.religion?.trim()) throw new BadRequestException('Agama wajib diisi.');
    if (merged.childOrder === undefined || merged.childOrder === null) throw new BadRequestException('Anak Ke- wajib diisi.');
    if (merged.siblingsCount === undefined || merged.siblingsCount === null) throw new BadRequestException('Jumlah Saudara Kandung wajib diisi.');
    if (!merged.childStatus) throw new BadRequestException('Status Anak wajib dipilih.');

    // 2. Strict Validation: Alamat
    if (!merged.country?.trim()) throw new BadRequestException('Negara wajib diisi.');
    if (!merged.fullAddress?.trim()) throw new BadRequestException('Alamat Lengkap tempat tinggal wajib diisi.');
    if (merged.country === 'Indonesia') {
      if (!merged.province?.trim()) throw new BadRequestException('Provinsi wajib diisi untuk wilayah Indonesia.');
      if (!merged.cityDistrict?.trim()) throw new BadRequestException('Kabupaten/Kota wajib diisi.');
      if (!merged.subDistrict?.trim()) throw new BadRequestException('Kecamatan wajib diisi.');
      if (!merged.village?.trim()) throw new BadRequestException('Kelurahan/Desa wajib diisi.');
      if (!merged.rt?.trim()) throw new BadRequestException('RT wajib diisi.');
      if (!merged.rw?.trim()) throw new BadRequestException('RW wajib diisi.');
      if (!merged.postalCode?.trim()) throw new BadRequestException('Kode Pos wajib diisi.');
    }

    // 3. Strict Validation: Asal Sekolah
    if (!merged.previousSchoolName?.trim()) throw new BadRequestException('Nama Sekolah Asal wajib diisi.');
    if (!merged.previousSchoolLevel) throw new BadRequestException('Jenjang Sekolah Asal wajib dipilih.');
    if (!merged.previousSchoolAddress?.trim()) throw new BadRequestException('Alamat Sekolah Asal wajib diisi.');
    if (!merged.graduationYear?.trim()) throw new BadRequestException('Tahun Lulus wajib diisi.');

    // 4. Strict Validation: Data Ayah
    if (!merged.fatherName?.trim()) throw new BadRequestException('Nama Lengkap Ayah wajib diisi.');
    if (!merged.fatherStatus) throw new BadRequestException('Status Ayah (Masih Hidup / Meninggal) wajib dipilih.');

    // 5. Strict Validation: Data Ibu
    if (!merged.motherName?.trim()) throw new BadRequestException('Nama Lengkap Ibu wajib diisi.');
    if (!merged.motherStatus) throw new BadRequestException('Status Ibu (Masih Hidup / Meninggal) wajib dipilih.');

    // 6. Conditional Validation: Kondisi Rumah Tangga
    if (merged.parentsMaritalStatus === 'Bercerai') {
      if (!merged.childCustody?.trim()) throw new BadRequestException('Hak asuh anak wajib dipilih jika status orang tua bercerai.');
      if (!merged.childLivingWith?.trim()) throw new BadRequestException('Tempat tinggal anak saat ini wajib dipilih jika status orang tua bercerai.');
    }

    // 7. Conditional Validation: Data Wali (Wajib jika Ayah Meninggal atau hasGuardian aktif)
    const isFatherDeceased = merged.fatherStatus === 'SUDAH_MENINGGAL' || merged.fatherStatus === 'MENINGGAL';
    if (isFatherDeceased || merged.hasGuardian === true) {
      if (!merged.guardianName?.trim()) throw new BadRequestException('Nama Lengkap Wali wajib diisi (karena status Ayah meninggal / memiliki wali).');
      if (!merged.guardianRelation?.trim()) throw new BadRequestException('Hubungan Wali dengan Santri wajib diisi.');
      if (!merged.guardianOccupation?.trim()) throw new BadRequestException('Pekerjaan Wali wajib diisi.');
      if (!merged.guardianWhatsapp?.trim()) throw new BadRequestException('Nomor WhatsApp/Telepon Wali wajib diisi.');
      if (!merged.guardianAddress?.trim()) throw new BadRequestException('Alamat Lengkap Wali wajib diisi.');
    }

    // 8. Strict Validation: Kontak Utama
    if (!merged.primaryContactName?.trim()) throw new BadRequestException('Nama Kontak Utama wajib diisi.');
    if (!merged.primaryContactRelation?.trim()) throw new BadRequestException('Hubungan Kontak Utama wajib diisi.');
    if (!merged.primaryContactWhatsapp?.trim()) throw new BadRequestException('Nomor WhatsApp Kontak Utama wajib diisi.');

    // 8. Strict Validation: Kondisi Fisik & Kebutuhan Khusus
    if (!merged.heightCm || merged.heightCm <= 0) throw new BadRequestException('Tinggi Badan (cm) wajib diisi.');
    if (!merged.weightKg || merged.weightKg <= 0) throw new BadRequestException('Berat Badan (kg) wajib diisi.');
    if (merged.hasSpecialNeeds === true && !merged.specialNeedsDescription?.trim()) {
      throw new BadRequestException('Keterangan Kebutuhan Khusus wajib diisi jika memiliki kebutuhan khusus.');
    }

    // 9. Strict Validation: Dokumen Wajib
    const docTypes = reg.documents.map(d => d.documentType);
    const requiredDocs: DocumentType[] = [
      DocumentType.FAMILY_CARD,
      DocumentType.BIRTH_CERTIFICATE,
      DocumentType.FATHER_ID_CARD,
      DocumentType.MOTHER_ID_CARD,
      DocumentType.PHOTO,
    ];

    if (merged.hasGuardian === true) {
      requiredDocs.push(DocumentType.GUARDIAN_ID_CARD);
    }

    const missingDocs = requiredDocs.filter(d => !docTypes.includes(d));
    if (missingDocs.length > 0) {
      throw new BadRequestException(
        `Dokumen wajib belum lengkap. Harap upload dokumen: ${missingDocs.join(', ')} sebelum mengirim final.`,
      );
    }

    // Prepare save data
    const birthDate = merged.birthDate ? new Date(merged.birthDate) : undefined;
    const fatherBirthDate = merged.fatherBirthDate ? new Date(merged.fatherBirthDate) : undefined;
    const motherBirthDate = merged.motherBirthDate ? new Date(merged.motherBirthDate) : undefined;
    const guardianBirthDate = merged.guardianBirthDate ? new Date(merged.guardianBirthDate) : undefined;

    const dataToSave: any = {
      ...merged,
      birthDate,
      fatherBirthDate,
      motherBirthDate,
      guardianBirthDate,
      id: undefined,
      registrationId: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      achievements: undefined,
    };
    Object.keys(dataToSave).forEach(key => dataToSave[key] === undefined && delete dataToSave[key]);

    await this.prisma.$transaction(async (tx) => {
      await tx.studentDetail.upsert({
        where: { registrationId: regId },
        update: dataToSave,
        create: {
          registrationId: regId,
          ...dataToSave,
        },
      });

      // Sync achievements
      if (Array.isArray(merged.achievements)) {
        await tx.studentAchievement.deleteMany({ where: { registrationId: regId } });
        if (merged.achievements.length > 0) {
          await tx.studentAchievement.createMany({
            data: merged.achievements.map((ach: AchievementItemDto) => ({
              registrationId: regId,
              name: ach.name.trim(),
              type: ach.type.trim(),
              level: (ach.level || '-').trim(),
              year: (ach.year || '').trim(),
              rank: (ach.rank || '').trim(),
            })),
          });
        }
      }

      // Update Individual summary
      await tx.individualParticipant.updateMany({
        where: { registrationId: regId },
        data: {
          fullName: merged.fullName.trim(),
          gender: merged.gender,
          schoolName: merged.previousSchoolName?.trim() || undefined,
        },
      });

      // Update registration status to SUBMITTED
      await tx.registration.update({
        where: { id: regId },
        data: {
          formStatus: FormStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });
    });

    await this.auditService.log({
      userId,
      action: 'SUBMIT_FINAL_FORM',
      targetTable: 'registrations',
      targetId: regId,
      details: `Kirim data final formulir pendaftaran: ${reg.registrationNumber}`,
    });

    const now = new Date();
    return {
      success: true,
      message: 'Formulir pendaftaran berhasil dikirim. Data Anda saat ini dalam antrean verifikasi Super Admin.',
      data: {
        registrationId: regId,
        formStatus: FormStatus.SUBMITTED,
        submittedAt: now,
      },
    };
  }

  /**
   * Uploads PSB Student Document (Magic Bytes validation, PDF/JPG/PNG, secure random filename, IDOR safe).
   */
  async uploadDocument(
    regId: string,
    userId: string,
    role: Role,
    documentType: DocumentType,
    file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('File dokumen tidak ditemukan.');
    }

    const reg = await this.prisma.registration.findUnique({
      where: { id: regId },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran tidak ditemukan.');
    }

    if (role === Role.PESERTA && reg.userId !== userId) {
      throw new ForbiddenException('Akses ditolak: Anda bukan pemilik data pendaftaran ini.');
    }

    if (role === Role.PESERTA && (reg.formStatus === FormStatus.SUBMITTED || reg.formStatus === FormStatus.VERIFIED)) {
      throw new BadRequestException(
        `Formulir dengan status ${reg.formStatus} tidak dapat mengubah dokumen kecuali diminta revisi oleh Super Admin.`,
      );
    }

    // Validate file buffer
    const validated = documentType === DocumentType.PHOTO
      ? FileValidatorUtil.validateImageBuffer(file.buffer, file.originalname)
      : FileValidatorUtil.validateDocumentBuffer(file.buffer, file.originalname);

    const targetPath = path.join(this.docsDir, validated.storageFilename);
    await fs.promises.writeFile(targetPath, file.buffer);

    // Check if document of same type exists for this registration -> delete old file
    const existingDoc = await this.prisma.registrationDocument.findFirst({
      where: {
        registrationId: regId,
        documentType,
      },
    });

    if (existingDoc) {
      const oldPath = path.join(this.docsDir, existingDoc.filePath);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch { }
      }

      const updated = await this.prisma.registrationDocument.update({
        where: { id: existingDoc.id },
        data: {
          filePath: validated.storageFilename,
          originalFileName: file.originalname,
          mimeType: validated.mimeType,
          fileSize: file.size,
          uploadedAt: new Date(),
        },
      });

      return {
        success: true,
        message: `Dokumen ${documentType} berhasil diperbarui.`,
        data: updated,
      };
    }

    const created = await this.prisma.registrationDocument.create({
      data: {
        registrationId: regId,
        documentType,
        filePath: validated.storageFilename,
        originalFileName: file.originalname,
        mimeType: validated.mimeType,
        fileSize: file.size,
      },
    });

    return {
      success: true,
      message: `Dokumen ${documentType} berhasil diunggah.`,
      data: created,
    };
  }

  /**
   * Deletes a student document (Owner / Super Admin).
   */
  async deleteDocument(regId: string, docId: string, userId: string, role: Role) {
    const doc = await this.prisma.registrationDocument.findUnique({
      where: { id: docId },
      include: { registration: true },
    });

    if (!doc || doc.registrationId !== regId) {
      throw new NotFoundException('Dokumen tidak ditemukan.');
    }

    if (role === Role.PESERTA && doc.registration.userId !== userId) {
      throw new ForbiddenException('Akses ditolak: Anda bukan pemilik dokumen ini.');
    }

    if (
      role === Role.PESERTA &&
      (doc.registration.formStatus === FormStatus.SUBMITTED || doc.registration.formStatus === FormStatus.VERIFIED)
    ) {
      throw new BadRequestException('Dokumen tidak dapat dihapus saat status formulir sudah SUBMITTED/VERIFIED.');
    }

    const filePath = path.join(this.docsDir, doc.filePath);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch { }
    }

    await this.prisma.registrationDocument.delete({ where: { id: docId } });

    return {
      success: true,
      message: 'Dokumen berhasil dihapus.',
    };
  }

  /**
   * Securely streams / serves document file with authorization check.
   */
  async getDocumentFile(regId: string, docId: string, userId: string, role: Role) {
    const doc = await this.prisma.registrationDocument.findUnique({
      where: { id: docId },
      include: { registration: true },
    });

    if (!doc || doc.registrationId !== regId) {
      throw new NotFoundException('Dokumen tidak ditemukan.');
    }

    if (role === Role.PESERTA && doc.registration.userId !== userId) {
      throw new ForbiddenException('Akses ditolak.');
    }

    const filePath = path.join(this.docsDir, FileValidatorUtil.sanitizeFilename(doc.filePath));
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File fisik dokumen tidak ditemukan di server.');
    }

    return {
      filePath,
      mimeType: doc.mimeType,
      fileName: doc.originalFileName,
    };
  }

  async getDocumentFileDirect(docId: string, userId: string, role: Role) {
    const doc = await this.prisma.registrationDocument.findUnique({
      where: { id: docId },
      include: { registration: true },
    });

    if (!doc) {
      throw new NotFoundException('Dokumen tidak ditemukan.');
    }

    if (role === Role.PESERTA && doc.registration.userId !== userId) {
      throw new ForbiddenException('Akses ditolak.');
    }

    const filePath = path.join(this.docsDir, FileValidatorUtil.sanitizeFilename(doc.filePath));
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File fisik dokumen tidak ditemukan di server.');
    }

    return {
      filePath,
      mimeType: doc.mimeType,
      fileName: doc.originalFileName,
    };
  }

  /**
   * Super Admin: Lists candidates for Data Verification table with status filter, search, period/wave/school filters.
   */
  async getAdminVerificationList(query: {
    search?: string;
    formStatus?: FormStatus;
    academicPeriodId?: string;
    admissionWaveId?: string;
    schoolId?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 25;
    const skip = (page - 1) * perPage;

    const where: any = {};

    if (query.formStatus) {
      where.formStatus = query.formStatus;
    }

    if (query.academicPeriodId) {
      where.academicPeriodId = query.academicPeriodId;
    }

    if (query.admissionWaveId) {
      where.admissionWaveId = query.admissionWaveId;
    }

    if (query.schoolId) {
      where.classProgram = {
        major: { schoolId: query.schoolId },
      };
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { registrationNumber: { contains: q, mode: 'insensitive' } },
        { individualParticipant: { fullName: { contains: q, mode: 'insensitive' } } },
        { studentDetail: { fullName: { contains: q, mode: 'insensitive' } } },
        { studentDetail: { nik: { contains: q, mode: 'insensitive' } } },
        { studentDetail: { nisn: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.registration.findMany({
        where,
        include: {
          academicPeriod: true,
          admissionWave: true,
          classProgram: {
            include: { major: { include: { school: true } } },
          },
          individualParticipant: true,
          studentDetail: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          verifiedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        skip,
        take: perPage,
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.registration.count({ where }),
    ]);

    return {
      success: true,
      data: items.map(reg => this.formatRegistrationResponse(reg)),
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  /**
   * Super Admin: Verifies candidate data -> Sets formStatus to VERIFIED.
   */
  async verifyCandidateForm(regId: string, adminUserId: string) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: regId },
      include: { user: true },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran tidak ditemukan.');
    }

    const updated = await this.prisma.registration.update({
      where: { id: regId },
      data: {
        formStatus: FormStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedByUserId: adminUserId,
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'VERIFY_CANDIDATE_DATA',
      targetTable: 'registrations',
      targetId: regId,
      details: `Verifikasi berkas data calon santri ${reg.registrationNumber} (${reg.user.name}) disetujui [VERIFIED]`,
    });

    return {
      success: true,
      message: 'Data calon santri berhasil diverifikasi (VERIFIED).',
      data: updated,
    };
  }

  /**
   * Super Admin: Lists candidates for Final Verification table with all stage summaries.
   */
  async getFinalVerificationList(query: {
    search?: string;
    finalStatus?: any;
    onlyCompletedStages?: boolean | string;
    academicPeriodId?: string;
    admissionWaveId?: string;
    schoolId?: string;
    majorId?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 25;
    const skip = (page - 1) * perPage;

    const where: any = {};

    if (query.finalStatus) {
      where.finalStatus = query.finalStatus;
    }

    if (query.onlyCompletedStages === true || query.onlyCompletedStages === 'true') {
      where.formStatus = FormStatus.VERIFIED;
      where.cbtAttempt = {
        status: { in: [CBTAttemptStatus.COMPLETED, CBTAttemptStatus.EXPIRED] },
      };
      where.interview = {
        status: InterviewStatus.COMPLETED,
      };
    }

    if (query.academicPeriodId) {
      where.academicPeriodId = query.academicPeriodId;
    }

    if (query.admissionWaveId) {
      where.admissionWaveId = query.admissionWaveId;
    }

    if (query.schoolId) {
      where.classProgram = {
        major: { schoolId: query.schoolId },
      };
    }

    if (query.majorId) {
      where.classProgram = {
        ...(where.classProgram || {}),
        majorId: query.majorId,
      };
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { registrationNumber: { contains: q, mode: 'insensitive' } },
        { individualParticipant: { fullName: { contains: q, mode: 'insensitive' } } },
        { studentDetail: { fullName: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.registration.findMany({
        where,
        include: {
          academicPeriod: true,
          admissionWave: true,
          classProgram: {
            include: { major: { include: { school: true } } },
          },
          individualParticipant: true,
          studentDetail: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          cbtAttempt: true,
          interview: {
            include: {
              schedule: true,
              interviewer: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          finalVerifiedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        skip,
        take: perPage,
        orderBy: [{ finalVerifiedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.registration.count({ where }),
    ]);

    return {
      success: true,
      data: items.map(reg => this.formatRegistrationResponse(reg)),
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  /**
   * Super Admin: Performs final admission verification (ACCEPTED / REJECTED / WAITLISTED / UNDECIDED).
   */
  async performFinalVerification(
    regId: string,
    dto: { finalStatus: any; notes?: string },
    adminUserId: string,
  ) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: regId },
      include: { user: true, studentDetail: true },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran tidak ditemukan.');
    }

    const updated = await this.prisma.registration.update({
      where: { id: regId },
      data: {
        finalStatus: dto.finalStatus,
        finalNotes: dto.notes ? dto.notes.trim() : null,
        finalVerifiedAt: new Date(),
        finalVerifiedByUserId: adminUserId,
      },
      include: {
        finalVerifiedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const studentName = reg.studentDetail?.fullName || reg.user?.name || reg.registrationNumber;
    await this.auditService.log({
      userId: adminUserId,
      action: 'FINAL_VERIFICATION_UPDATE',
      targetTable: 'registrations',
      targetId: regId,
      details: `Keputusan verifikasi final ${studentName} (${reg.registrationNumber}): ${dto.finalStatus}. Catatan: ${dto.notes || '-'}`,
    });

    return updated;
  }

  /**
   * Super Admin: Requests revision -> Sets formStatus to REVISION_REQUIRED with mandatory notes.
   */
  async requestCandidateRevision(regId: string, adminUserId: string, dto: RequestRevisionDto) {
    if (!dto.revisionNotes || !dto.revisionNotes.trim()) {
      throw new BadRequestException('Catatan / alasan revisi wajib diisi.');
    }

    const reg = await this.prisma.registration.findUnique({
      where: { id: regId },
      include: { user: true },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran tidak ditemukan.');
    }

    const updated = await this.prisma.registration.update({
      where: { id: regId },
      data: {
        formStatus: FormStatus.REVISION_REQUIRED,
        revisionNotes: dto.revisionNotes.trim(),
        verifiedByUserId: adminUserId,
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'REQUEST_REVISION',
      targetTable: 'registrations',
      targetId: regId,
      details: `Permintaan revisi berkas pendaftaran ${reg.registrationNumber}: "${dto.revisionNotes.trim()}"`,
    });

    return {
      success: true,
      message: 'Permintaan revisi berhasil dikirim ke calon santri.',
      data: updated,
    };
  }

  /**
   * Retrieves all registrations submitted by the specified user.
   */
  async getUserRegistrations(userId: string) {
    const registrations = await this.prisma.registration.findMany({
      where: { userId },
      include: {
        academicPeriod: true,
        admissionWave: true,
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
        team: {
          include: {
            members: true,
          },
        },
        payments: {
          include: {
            paymentAccount: true,
            verificationLogs: {
              orderBy: { verifiedAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        checkIn: {
          include: {
            checkedInBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        cbtAttempt: true,
        interview: {
          include: {
            schedule: true,
            interviewer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return registrations.map(reg => this.formatRegistrationResponse(reg));
  }

  /**
   * Retrieves registration detail with strict ownership / IDOR check.
   */
  async getRegistrationById(id: string, requesterUserId: string, requesterRole: Role) {
    const reg = await this.prisma.registration.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        academicPeriod: true,
        admissionWave: true,
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
        achievements: true,
        documents: true,
        team: {
          include: {
            members: true,
          },
        },
        payments: {
          include: {
            paymentAccount: true,
            verificationLogs: {
              include: {
                verifiedBy: {
                  select: { id: true, name: true, role: true },
                },
              },
              orderBy: { verifiedAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        checkIn: {
          include: {
            checkedInBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        cbtAttempt: true,
      },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran tidak ditemukan.');
    }

    // IDOR Protection: Peserta can only access their own registration
    if (requesterRole === Role.PESERTA && reg.userId !== requesterUserId) {
      throw new ForbiddenException('Akses ditolak: Anda tidak memiliki izin melihat data ini.');
    }

    return this.formatRegistrationResponse(reg);
  }

  /**
   * Retrieves all registrations across system for Staff/Super Admin with search, filter, and pagination.
   */
  async listAllRegistrations(
    search?: string,
    status?: RegistrationStatus,
    classProgramId?: string,
    page = 1,
    perPage = 25,
  ) {
    const skip = (page - 1) * perPage;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (classProgramId) {
      where.classProgramId = classProgramId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { registrationNumber: { contains: q, mode: 'insensitive' } },
        { individualParticipant: { fullName: { contains: q, mode: 'insensitive' } } },
        { studentDetail: { fullName: { contains: q, mode: 'insensitive' } } },
        { individualParticipant: { schoolName: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [registrations, total] = await Promise.all([
      this.prisma.registration.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, phoneNumber: true },
          },
          academicPeriod: true,
          admissionWave: true,
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
          team: {
            include: {
              members: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          checkIn: true,
        },
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.registration.count({ where }),
    ]);

    return {
      registrations: registrations.map(reg => this.formatRegistrationResponse(reg)),
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  /**
   * Normalizes Registration payload to provide both PSB fields and backward-compatible branch/level/category aliases.
   */
  private formatRegistrationResponse(reg: any) {
    const cp = reg.classProgram;
    const major = cp?.major;
    const school = major?.school;

    // Backward-compatibility aliasing
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
      ...reg,
      branchId: reg.classProgramId,
      branch: branchAlias,
      schoolName: school?.name || '',
      majorName: major?.name || '',
      classProgramName: cp?.name || '',
      isFormUnlocked: reg.isFormUnlocked || reg.status === RegistrationStatus.APPROVED,
    };
  }
}
