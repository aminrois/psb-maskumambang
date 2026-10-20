import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');
import * as ExcelJS from 'exceljs';
import * as QRCode from 'qrcode';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver');
import {
  DocumentType,
  FormStatus,
  FinalAdmissionStatus,
  PaymentStatus,
  BoardingStatus,
} from '@prisma/client';

export interface ExportFilterDto {
  schoolId?: string;
  admissionWaveId?: string;
  academicPeriodId?: string;
  formStatus?: FormStatus;
  finalStatus?: FinalAdmissionStatus;
  paymentStatus?: PaymentStatus;
  boardingStatus?: BoardingStatus;
  search?: string;
  registrationIds?: string[];
}

@Injectable()
export class RegistrationsExportService {
  private readonly logger = new Logger(RegistrationsExportService.name);
  private readonly docsDir: string;
  private readonly paymentProofsDir: string;
  private readonly logoPath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    const baseUpload = this.configService.get<string>('upload.folder') || 'uploads';
    this.docsDir = path.resolve(process.cwd(), baseUpload, 'documents');
    this.paymentProofsDir = path.resolve(process.cwd(), baseUpload, 'payment_proofs');

    // Default logo candidates
    const possibleLogos = [
      path.resolve(process.cwd(), 'public/static/img/logo_b575283667.png'),
      path.resolve(process.cwd(), 'public/static/img/logo_df7db21c87.png'),
      path.resolve(process.cwd(), 'public/static/img/favicon_6d95e3367f.png'),
    ];
    this.logoPath = possibleLogos.find((p) => fs.existsSync(p)) || '';
  }

  /**
   * Cleans string to safely be used as filename component.
   */
  private sanitizeName(name?: string | null): string {
    if (!name) return 'SANTRI';
    return name
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toUpperCase();
  }

  /**
   * Cleans registration number.
   */
  private sanitizeRegNumber(regNo?: string | null): string {
    if (!regNo) return 'NOREG';
    return regNo
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Returns standard file and zip prefix: NAMA_Nomorpendaftaran
   */
  public getFilePrefix(reg: any): string {
    const rawName =
      reg.studentDetail?.fullName ||
      reg.individualParticipant?.fullName ||
      reg.user?.name ||
      'SANTRI';
    const cleanName = this.sanitizeName(rawName);
    const cleanReg = this.sanitizeRegNumber(reg.registrationNumber);
    return `${cleanName}_${cleanReg}`;
  }

  /**
   * Query single registration with all relations for export.
   */
  public async getFullRegistration(id: string) {
    const reg = await this.prisma.registration.findFirst({
      where: {
        OR: [{ id }, { registrationNumber: id }],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            username: true,
          },
        },
        classProgram: {
          include: {
            major: {
              include: {
                school: true,
              },
            },
          },
        },
        academicPeriod: true,
        admissionWave: true,
        studentDetail: true,
        achievements: {
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        individualParticipant: true,
        team: {
          include: {
            members: true,
          },
        },
        cbtAttempt: true,
        interview: true,
        practicalTest: true,
        verifiedBy: {
          select: { id: true, name: true },
        },
        finalVerifiedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!reg) {
      throw new NotFoundException(`Data pendaftaran ${id} tidak ditemukan.`);
    }
    return reg;
  }

  /**
   * Build query filter for batch export or list preview.
   */
  private buildWhereClause(filter: ExportFilterDto) {
    const where: any = {};

    if (filter.registrationIds && filter.registrationIds.length > 0) {
      where.id = { in: filter.registrationIds };
      return where;
    }

    if (filter.schoolId) {
      where.classProgram = {
        major: {
          schoolId: filter.schoolId,
        },
      };
    }

    if (filter.admissionWaveId) {
      where.admissionWaveId = filter.admissionWaveId;
    }

    if (filter.academicPeriodId) {
      where.academicPeriodId = filter.academicPeriodId;
    }

    if (filter.formStatus) {
      where.formStatus = filter.formStatus;
    }

    if (filter.finalStatus) {
      where.finalStatus = filter.finalStatus;
    }

    if (filter.boardingStatus) {
      where.boardingStatus = filter.boardingStatus;
    }

    if (filter.paymentStatus) {
      where.payments = {
        some: {
          status: filter.paymentStatus,
        },
      };
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { registrationNumber: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { phoneNumber: { contains: q, mode: 'insensitive' } } },
        { studentDetail: { fullName: { contains: q, mode: 'insensitive' } } },
        { studentDetail: { nisn: { contains: q, mode: 'insensitive' } } },
        { studentDetail: { nik: { contains: q, mode: 'insensitive' } } },
        { studentDetail: { previousSchoolName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  /**
   * Get preview list of students matching filter.
   */
  public async getPreviewList(filter: ExportFilterDto, page = 1, perPage = 25) {
    const where = this.buildWhereClause(filter);
    const skip = (Math.max(1, page) - 1) * perPage;

    const [total, items] = await Promise.all([
      this.prisma.registration.count({ where }),
      this.prisma.registration.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, phoneNumber: true, email: true },
          },
          classProgram: {
            include: {
              major: {
                include: {
                  school: { select: { id: true, name: true, initial: true } },
                },
              },
            },
          },
          admissionWave: {
            select: { id: true, name: true },
          },
          academicPeriod: {
            select: { id: true, name: true },
          },
          studentDetail: {
            select: {
              id: true,
              fullName: true,
              gender: true,
              nisn: true,
              previousSchoolName: true,
              cityDistrict: true,
            },
          },
          documents: {
            select: {
              id: true,
              documentType: true,
              filePath: true,
              originalFileName: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              proofImagePath: true,
            },
          },
        },
      }),
    ]);

    const mapped = items.map((reg) => {
      const name =
        reg.studentDetail?.fullName || reg.user?.name || 'Belum Diisi';
      const docTypes = reg.documents.map((d) => d.documentType);
      const hasPhoto = docTypes.includes(DocumentType.PHOTO);
      const hasKK = docTypes.includes(DocumentType.FAMILY_CARD);
      const hasAkta = docTypes.includes(DocumentType.BIRTH_CERTIFICATE);
      const hasIjazah = docTypes.includes(DocumentType.DIPLOMA_OR_SKL);
      const hasPayment = reg.payments.some((p: any) => p.status === PaymentStatus.APPROVED);
      const prefix = this.getFilePrefix(reg);

      return {
        id: reg.id,
        registrationNumber: reg.registrationNumber,
        filePrefix: prefix,
        zipFilename: `${prefix}.zip`,
        name,
        gender: reg.studentDetail?.gender || '-',
        nisn: reg.studentDetail?.nisn || '-',
        schoolName: reg.classProgram?.major?.school?.name || '-',
        schoolInitial: reg.classProgram?.major?.school?.initial || '-',
        programName: reg.classProgram?.name || '-',
        waveName: reg.admissionWave?.name || '-',
        periodName: reg.academicPeriod?.name || '-',
        formStatus: reg.formStatus,
        finalStatus: reg.finalStatus,
        createdAt: reg.createdAt,
        documentSummary: {
          totalDocuments: reg.documents.length,
          hasPhoto,
          hasKK,
          hasAkta,
          hasIjazah,
          hasPayment,
        },
      };
    });

    return {
      success: true,
      data: mapped,
      pagination: {
        page: Math.max(1, page),
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  /**
   * Returns filter options (schools, waves, periods, statuses).
   */
  public async getFilterOptions() {
    const [schools, waves, periods] = await Promise.all([
      this.prisma.school.findMany({
        where: { isActive: true },
        select: { id: true, name: true, initial: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.admissionWave.findMany({
        select: { id: true, name: true, academicPeriodId: true },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.academicPeriod.findMany({
        select: { id: true, name: true, isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      success: true,
      data: {
        schools,
        waves,
        periods,
        formStatuses: Object.values(FormStatus),
        finalStatuses: Object.values(FinalAdmissionStatus),
        paymentStatuses: Object.values(PaymentStatus),
        boardingStatuses: Object.values(BoardingStatus),
      },
    };
  }

  /**
   * Generates official Registration Biodata PDF.
   */
  public async generateStudentBiodataPdf(reg: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36, // 0.5 inch margins
          info: {
            Title: `Formulir Biodata - ${reg.registrationNumber}`,
            Author: 'Pondok Pesantren Maskumambang',
            Subject: 'Formulir Pendaftaran Santri Baru',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header / Kop Surat
        const startX = 36;
        let startY = 36;

        // Try adding logo
        if (this.logoPath && fs.existsSync(this.logoPath)) {
          try {
            doc.image(this.logoPath, startX, startY, { width: 55, height: 55 });
          } catch {
            // Ignore logo draw error
          }
        }

        // Kop text
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('YAYASAN KEBANGKITAN UMMAT ISLAM (YKUI)', startX + 65, startY, {
            align: 'center',
            width: 420,
          });
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .fillColor('#065f46')
          .text('PONDOK PESANTREN MASKUMAMBANG', startX + 65, startY + 14, {
            align: 'center',
            width: 420,
          });
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#1e293b')
          .text('PANITIA PENERIMAAN SANTRI BARU (PSB)', startX + 65, startY + 31, {
            align: 'center',
            width: 420,
          });
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#64748b')
          .text(
            'Jl. Raya Sembungan Kidul Dukun Gresik Jawa Timur 61153 | Telp: (031) 3949168 | psb.maskumambang.ac.id',
            startX + 65,
            startY + 46,
            { align: 'center', width: 420 },
          );

        // Header double line
        const lineY = startY + 62;
        doc
          .strokeColor('#065f46')
          .lineWidth(2)
          .moveTo(startX, lineY)
          .lineTo(595 - startX, lineY)
          .stroke();
        doc
          .strokeColor('#94a3b8')
          .lineWidth(0.5)
          .moveTo(startX, lineY + 3)
          .lineTo(595 - startX, lineY + 3)
          .stroke();

        // Title box
        const titleY = lineY + 10;
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .fillColor('#0f172a')
          .text('FORMULIR BIODATA & DATA REGISTRASI SANTRI BARU', startX, titleY, {
            align: 'center',
          });

        // Top Summary Badge Bar & Photo & QR Code
        const infoBoxY = titleY + 18;
        doc
          .rect(startX, infoBoxY, 523, 76)
          .fillAndStroke('#f8fafc', '#cbd5e1');

        // Draw registration badge info
        const schoolName =
          reg.classProgram?.major?.school?.name ||
          reg.classProgram?.major?.name ||
          '-';
        const progName = reg.classProgram?.name || '-';
        const waveName = reg.admissionWave?.name || '-';
        const periodName = reg.academicPeriod?.name || '-';
        const boardingLabel =
          reg.boardingStatus === 'MUKIM' ? 'Mukim (Asrama)' : 'Non-Mukim (Pulang-Pergi)';

        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5);
        doc.text('Nomor Pendaftaran', startX + 10, infoBoxY + 8);
        doc.font('Helvetica').text(`: ${reg.registrationNumber}`, startX + 115, infoBoxY + 8);

        doc.font('Helvetica-Bold').text('Lembaga / Sekolah', startX + 10, infoBoxY + 22);
        doc.font('Helvetica').text(`: ${schoolName} - ${progName}`, startX + 115, infoBoxY + 22);

        doc.font('Helvetica-Bold').text('Gelombang & Periode', startX + 10, infoBoxY + 36);
        doc.font('Helvetica').text(`: ${waveName} (T.P. ${periodName})`, startX + 115, infoBoxY + 36);

        doc.font('Helvetica-Bold').text('Status Asrama', startX + 10, infoBoxY + 50);
        doc.font('Helvetica').text(`: ${boardingLabel}`, startX + 115, infoBoxY + 50);

        doc.font('Helvetica-Bold').text('Status Kelulusan', startX + 10, infoBoxY + 64);
        const finalStatusLabel =
          reg.finalStatus === 'LULUS'
            ? 'LULUS SELEKSI'
            : reg.finalStatus === 'CADANGAN'
            ? 'CADANGAN'
            : reg.finalStatus === 'TIDAK_LULUS'
            ? 'TIDAK LULUS'
            : 'MENUNGGU KEPUTUSAN';
        doc
          .font('Helvetica-Bold')
          .fillColor(
            reg.finalStatus === 'LULUS'
              ? '#059669'
              : reg.finalStatus === 'TIDAK_LULUS'
              ? '#dc2626'
              : '#d97706',
          )
          .text(`: ${finalStatusLabel}`, startX + 115, infoBoxY + 64);

        // QR Code for verification
        try {
          const qrData = JSON.stringify({
            regNo: reg.registrationNumber,
            name: reg.studentDetail?.fullName || reg.user?.name,
            token: reg.qrCodeToken,
            url: `https://psb.maskumambang.ac.id/dashboard.html#detail/${reg.id}`,
          });
          const qrBuffer = await QRCode.toBuffer(qrData, {
            width: 60,
            margin: 0,
          });
          doc.image(qrBuffer, startX + 380, infoBoxY + 8, { width: 60, height: 60 });
          doc
            .font('Helvetica')
            .fontSize(6.5)
            .fillColor('#64748b')
            .text('Verifikasi Digital', startX + 375, infoBoxY + 68, { width: 70, align: 'center' });
        } catch {
          // Ignore QR error
        }

        // Student Photo if available
        const photoDoc = reg.documents?.find(
          (d: any) => d.documentType === DocumentType.PHOTO,
        );
        let photoDrawn = false;
        if (photoDoc) {
          const photoPath = path.join(this.docsDir, photoDoc.filePath);
          if (fs.existsSync(photoPath)) {
            try {
              doc.image(photoPath, startX + 458, infoBoxY + 8, {
                fit: [55, 65],
                align: 'center',
                valign: 'center',
              });
              photoDrawn = true;
            } catch {
              // photo not image or corrupted
            }
          }
        }
        if (!photoDrawn) {
          doc
            .rect(startX + 458, infoBoxY + 8, 55, 65)
            .stroke('#94a3b8');
          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor('#94a3b8')
            .text('Foto 3x4', startX + 458, infoBoxY + 34, { width: 55, align: 'center' });
        }

        // Helper to draw section titles
        let currentY = infoBoxY + 84;

        const drawSectionHeader = (title: string) => {
          if (currentY > 730) {
            doc.addPage();
            currentY = 36;
          }
          doc
            .rect(startX, currentY, 523, 16)
            .fill('#065f46');
          doc
            .font('Helvetica-Bold')
            .fontSize(8.5)
            .fillColor('#ffffff')
            .text(title, startX + 8, currentY + 3.5);
          currentY += 20;
        };

        const drawTwoColRow = (
          label1: string,
          val1: string,
          label2: string,
          val2: string,
        ) => {
          if (currentY > 760) {
            doc.addPage();
            currentY = 36;
          }
          const rowH = 13;
          doc.fillColor('#0f172a').fontSize(7.5);

          // Col 1
          doc.font('Helvetica-Bold').text(label1, startX + 6, currentY);
          doc.font('Helvetica').text(`: ${val1 || '-'}`, startX + 105, currentY, { width: 150 });

          // Col 2
          doc.font('Helvetica-Bold').text(label2, startX + 265, currentY);
          doc.font('Helvetica').text(`: ${val2 || '-'}`, startX + 375, currentY, { width: 145 });

          currentY += rowH;
        };

        const drawFullRow = (label: string, val: string) => {
          if (currentY > 760) {
            doc.addPage();
            currentY = 36;
          }
          const rowH = 13;
          doc.fillColor('#0f172a').fontSize(7.5);
          doc.font('Helvetica-Bold').text(label, startX + 6, currentY);
          doc.font('Helvetica').text(`: ${val || '-'}`, startX + 105, currentY, { width: 410 });
          currentY += rowH;
        };

        const sd = reg.studentDetail || {};

        // SECTION A: DATA PRIBADI
        drawSectionHeader('A. DATA PRIBADI CALON SANTRI');
        drawTwoColRow('Nama Lengkap', sd.fullName || reg.user?.name, 'Jenis Kelamin', sd.gender === 'L' ? 'Laki-Laki' : sd.gender === 'P' ? 'Perempuan' : '-');
        drawTwoColRow('NIK (KTP)', sd.nik, 'No. Kartu Keluarga', sd.familyCardNumber);
        drawTwoColRow('NISN', sd.nisn, 'No. Akta Kelahiran', sd.birthCertificateNumber);
        const birthDateStr = sd.birthDate
          ? new Date(sd.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
          : '-';
        drawTwoColRow('Tempat Lahir', sd.birthPlace, 'Tanggal Lahir', birthDateStr);
        drawTwoColRow('Agama', sd.religion || 'Islam', 'Golongan Darah', sd.bloodType || '-');
        drawTwoColRow('Anak Ke', sd.childOrder ? `${sd.childOrder}` : '-', 'Jumlah Saudara', sd.siblingsCount ? `${sd.siblingsCount} orang` : '-');
        drawTwoColRow('Status Anak', sd.childStatus || 'Kandung', 'Tinggi / Berat Badan', `${sd.heightCm ? sd.heightCm + ' cm' : '-'} / ${sd.weightKg ? sd.weightKg + ' kg' : '-'}`);

        // SECTION B: ALAMAT & TEMPAT TINGGAL
        currentY += 4;
        drawSectionHeader('B. ALAMAT DOMISILI & TEMPAT TINGGAL');
        drawFullRow('Alamat Lengkap', sd.fullAddress);
        drawTwoColRow('RT / RW', `${sd.rt || '-'}/${sd.rw || '-'}`, 'Desa / Kelurahan', sd.village);
        drawTwoColRow('Kecamatan', sd.subDistrict, 'Kabupaten / Kota', sd.cityDistrict);
        drawTwoColRow('Provinsi', sd.province, 'Kode Pos', sd.postalCode);
        drawTwoColRow('Status Rumah', sd.homeOwnership, 'Daya Listrik / Air', `${sd.electricityPower || '-'} / ${sd.waterSource || '-'}`);
        drawTwoColRow('Transportasi', sd.transportationMode, 'Jarak ke Pesantren', sd.distanceToSchool);

        // SECTION C: DATA ASAL SEKOLAH
        currentY += 4;
        drawSectionHeader('C. DATA ASAL SEKOLAH');
        drawTwoColRow('Nama Sekolah Asal', sd.previousSchoolName, 'NPSN Sekolah', sd.previousSchoolNpsn);
        drawTwoColRow('Jenjang Sekolah', sd.previousSchoolLevel, 'Tahun Kelulusan', sd.graduationYear);
        drawTwoColRow('No. Ijazah / SKL', sd.diplomaNumber, 'Alamat Sekolah', sd.previousSchoolAddress);

        // SECTION D: DATA ORANG TUA / WALI
        currentY += 4;
        drawSectionHeader('D. DATA ORANG TUA / WALI');
        drawTwoColRow('Nama Ayah', sd.fatherName, 'NIK Ayah', sd.fatherNik);
        drawTwoColRow('Status Ayah', sd.fatherStatus, 'Pekerjaan Ayah', sd.fatherOccupation);
        drawTwoColRow('Pendidikan Ayah', sd.fatherEducation, 'Penghasilan Ayah', sd.fatherMonthlyIncome);
        drawTwoColRow('No. WhatsApp Ayah', sd.fatherWhatsapp, 'Tempat Lahir Ayah', sd.fatherBirthPlace);

        currentY += 2;
        drawTwoColRow('Nama Ibu', sd.motherName, 'NIK Ibu', sd.motherNik);
        drawTwoColRow('Status Ibu', sd.motherStatus, 'Pekerjaan Ibu', sd.motherOccupation);
        drawTwoColRow('Pendidikan Ibu', sd.motherEducation, 'Penghasilan Ibu', sd.motherMonthlyIncome);
        drawTwoColRow('No. WhatsApp Ibu', sd.motherWhatsapp, 'Tempat Lahir Ibu', sd.motherBirthPlace);

        if (sd.hasGuardian) {
          currentY += 2;
          drawTwoColRow('Nama Wali', sd.guardianName, 'Hubungan Wali', sd.guardianRelation);
          drawTwoColRow('Pekerjaan Wali', sd.guardianOccupation, 'No. WhatsApp Wali', sd.guardianWhatsapp);
        }

        // SECTION E: KONTAK & RIWAYAT KESEHATAN
        currentY += 4;
        drawSectionHeader('E. KONTAK DARURAT & RIWAYAT KESEHATAN');
        drawTwoColRow('Kontak Utama', `${sd.primaryContactName || '-'} (${sd.primaryContactRelation || '-'})`, 'No. WA / HP', sd.primaryContactWhatsapp || reg.user?.phoneNumber);
        drawTwoColRow('Riwayat Penyakit', sd.diseaseHistory || 'Tidak Ada', 'Riwayat Alergi', sd.allergyHistory || 'Tidak Ada');
        drawTwoColRow('Kondisi Mata', `Minus: ${sd.eyeMinusLeft || 0}/${sd.eyeMinusRight || 0}`, 'Status Buta Warna', sd.colorBlindStatus || 'Tidak');

        // PRESTASI (IF ANY)
        if (reg.achievements && reg.achievements.length > 0) {
          currentY += 4;
          drawSectionHeader('F. DAFTAR PRESTASI SANTRI');
          reg.achievements.forEach((ach: any, idx: number) => {
            drawTwoColRow(
              `Prestasi ${idx + 1}`,
              `${ach.name} (${ach.rank})`,
              'Tingkat / Tahun',
              `${ach.level} / ${ach.year}`,
            );
          });
        }

        // TANDA TANGAN / PENGESAHAN
        currentY += 12;
        if (currentY > 700) {
          doc.addPage();
          currentY = 36;
        }

        const signBoxY = currentY;
        const nowStr = new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#0f172a');

        // Kiri: Pernyataan Santri / Wali
        doc.text(`Gresik, ${nowStr}`, startX + 20, signBoxY);
        doc.text('Calon Santri / Orang Tua / Wali,', startX + 20, signBoxY + 12);
        doc.text('( .................................................. )', startX + 20, signBoxY + 60);

        // Kanan: Panitia PSB
        doc.text('Panitia Penerimaan Santri Baru,', startX + 340, signBoxY + 12);
        const verifierName = reg.verifiedBy?.name || 'Sekretariat PSB';
        doc.text(`( ${verifierName} )`, startX + 340, signBoxY + 60);

        // Footer note
        doc
          .font('Helvetica-Oblique')
          .fontSize(6.5)
          .fillColor('#94a3b8')
          .text(
            '* Dokumen ini adalah arsip resmi PSB Pondok Pesantren Maskumambang Dukun Gresik.',
            startX,
            signBoxY + 76,
            { align: 'center', width: 523 },
          );

        doc.end();
      } catch (err) {
        this.logger.error('Error generating PDF biodata:', err);
        reject(err);
      }
    });
  }

  /**
   * Generates official Registration Biodata Excel (.xlsx).
   */
  public async generateStudentBiodataExcel(reg: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PSB Maskumambang';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('BIODATA_SANTRI', {
      properties: { tabColor: { argb: '065F46' } },
    });

    sheet.views = [{ showGridLines: true }];

    // Column definitions
    sheet.columns = [
      { key: 'category', width: 22 },
      { key: 'field', width: 28 },
      { key: 'value', width: 45 },
      { key: 'notes', width: 25 },
    ];

    // Title Row
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'FORMULIR BIODATA & DATA REGISTRASI SANTRI BARU';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF065F46' },
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 32;

    // Subtitle Row
    sheet.mergeCells('A2:D2');
    const subTitle = sheet.getCell('A2');
    subTitle.value = `PONDOK PESANTREN MASKUMAMBANG DUKUN GRESIK | ${reg.registrationNumber}`;
    subTitle.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF1E293B' } };
    subTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    // Header Table Row
    const headerRow = sheet.getRow(4);
    headerRow.values = ['KATEGORI', 'NAMA DATA / FIELD', 'NILAI / ISIAN', 'KETERANGAN'];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    headerRow.height = 24;

    const sd = reg.studentDetail || {};
    const birthDateStr = sd.birthDate
      ? new Date(sd.birthDate).toLocaleDateString('id-ID')
      : '-';

    const rowsData: Array<[string, string, string, string]> = [
      // Pendaftaran
      ['PENDAFTARAN', 'Nomor Pendaftaran', reg.registrationNumber || '-', 'Kode unik'],
      ['PENDAFTARAN', 'Lembaga / Sekolah', reg.classProgram?.major?.school?.name || '-', ''],
      ['PENDAFTARAN', 'Program / Jurusan', reg.classProgram?.name || '-', ''],
      ['PENDAFTARAN', 'Gelombang', reg.admissionWave?.name || '-', ''],
      ['PENDAFTARAN', 'Tahun Pelajaran', reg.academicPeriod?.name || '-', ''],
      ['PENDAFTARAN', 'Status Asrama', reg.boardingStatus || '-', 'MUKIM / NON_MUKIM'],
      ['PENDAFTARAN', 'Status Berkas', reg.formStatus || '-', ''],
      ['PENDAFTARAN', 'Status Kelulusan', reg.finalStatus || '-', ''],
      ['PENDAFTARAN', 'Tanggal Daftar', reg.createdAt ? new Date(reg.createdAt).toLocaleString('id-ID') : '-', ''],

      // Pribadi
      ['DATA PRIBADI', 'Nama Lengkap', sd.fullName || reg.user?.name || '-', ''],
      ['DATA PRIBADI', 'Jenis Kelamin', sd.gender === 'L' ? 'Laki-Laki' : sd.gender === 'P' ? 'Perempuan' : '-', ''],
      ['DATA PRIBADI', 'NIK Santri', sd.nik || '-', ''],
      ['DATA PRIBADI', 'Nomor Kartu Keluarga', sd.familyCardNumber || '-', ''],
      ['DATA PRIBADI', 'NISN', sd.nisn || '-', ''],
      ['DATA PRIBADI', 'Nomor Akta Kelahiran', sd.birthCertificateNumber || '-', ''],
      ['DATA PRIBADI', 'Tempat Lahir', sd.birthPlace || '-', ''],
      ['DATA PRIBADI', 'Tanggal Lahir', birthDateStr, ''],
      ['DATA PRIBADI', 'Agama', sd.religion || 'Islam', ''],
      ['DATA PRIBADI', 'Golongan Darah', sd.bloodType || '-', ''],
      ['DATA PRIBADI', 'Anak Ke-', sd.childOrder ? `${sd.childOrder}` : '-', ''],
      ['DATA PRIBADI', 'Jumlah Saudara', sd.siblingsCount ? `${sd.siblingsCount}` : '-', ''],
      ['DATA PRIBADI', 'Status Anak', sd.childStatus || 'Kandung', ''],
      ['DATA PRIBADI', 'Tinggi Badan (cm)', sd.heightCm ? `${sd.heightCm}` : '-', ''],
      ['DATA PRIBADI', 'Berat Badan (kg)', sd.weightKg ? `${sd.weightKg}` : '-', ''],

      // Alamat
      ['ALAMAT', 'Alamat Lengkap', sd.fullAddress || '-', ''],
      ['ALAMAT', 'RT / RW', `${sd.rt || '-'}/${sd.rw || '-'}`, ''],
      ['ALAMAT', 'Desa / Kelurahan', sd.village || '-', ''],
      ['ALAMAT', 'Kecamatan', sd.subDistrict || '-', ''],
      ['ALAMAT', 'Kabupaten / Kota', sd.cityDistrict || '-', ''],
      ['ALAMAT', 'Provinsi', sd.province || '-', ''],
      ['ALAMAT', 'Kode Pos', sd.postalCode || '-', ''],
      ['ALAMAT', 'Status Kepemilikan Rumah', sd.homeOwnership || '-', ''],
      ['ALAMAT', 'Daya Listrik', sd.electricityPower || '-', ''],
      ['ALAMAT', 'Sumber Air', sd.waterSource || '-', ''],
      ['ALAMAT', 'Transportasi ke Sekolah', sd.transportationMode || '-', ''],
      ['ALAMAT', 'Jarak ke Sekolah', sd.distanceToSchool || '-', ''],

      // Asal Sekolah
      ['ASAL SEKOLAH', 'Nama Sekolah Asal', sd.previousSchoolName || '-', ''],
      ['ASAL SEKOLAH', 'NPSN Sekolah', sd.previousSchoolNpsn || '-', ''],
      ['ASAL SEKOLAH', 'Jenjang', sd.previousSchoolLevel || '-', ''],
      ['ASAL SEKOLAH', 'Tahun Kelulusan', sd.graduationYear || '-', ''],
      ['ASAL SEKOLAH', 'Nomor Ijazah / SKL', sd.diplomaNumber || '-', ''],
      ['ASAL SEKOLAH', 'Alamat Sekolah', sd.previousSchoolAddress || '-', ''],

      // Data Ayah
      ['DATA AYAH', 'Nama Ayah', sd.fatherName || '-', ''],
      ['DATA AYAH', 'NIK Ayah', sd.fatherNik || '-', ''],
      ['DATA AYAH', 'Status Ayah', sd.fatherStatus || '-', ''],
      ['DATA AYAH', 'Tempat Lahir Ayah', sd.fatherBirthPlace || '-', ''],
      ['DATA AYAH', 'Pendidikan Ayah', sd.fatherEducation || '-', ''],
      ['DATA AYAH', 'Pekerjaan Ayah', sd.fatherOccupation || '-', ''],
      ['DATA AYAH', 'Penghasilan Ayah', sd.fatherMonthlyIncome || '-', ''],
      ['DATA AYAH', 'No. WhatsApp Ayah', sd.fatherWhatsapp || '-', ''],

      // Data Ibu
      ['DATA IBU', 'Nama Ibu', sd.motherName || '-', ''],
      ['DATA IBU', 'NIK Ibu', sd.motherNik || '-', ''],
      ['DATA IBU', 'Status Ibu', sd.motherStatus || '-', ''],
      ['DATA IBU', 'Tempat Lahir Ibu', sd.motherBirthPlace || '-', ''],
      ['DATA IBU', 'Pendidikan Ibu', sd.motherEducation || '-', ''],
      ['DATA IBU', 'Pekerjaan Ibu', sd.motherOccupation || '-', ''],
      ['DATA IBU', 'Penghasilan Ibu', sd.motherMonthlyIncome || '-', ''],
      ['DATA IBU', 'No. WhatsApp Ibu', sd.motherWhatsapp || '-', ''],

      // Data Wali
      ['DATA WALI', 'Ada Wali', sd.hasGuardian ? 'Ya' : 'Tidak', ''],
      ['DATA WALI', 'Nama Wali', sd.guardianName || '-', ''],
      ['DATA WALI', 'Hubungan Wali', sd.guardianRelation || '-', ''],
      ['DATA WALI', 'Pekerjaan Wali', sd.guardianOccupation || '-', ''],
      ['DATA WALI', 'No. WhatsApp Wali', sd.guardianWhatsapp || '-', ''],

      // Kontak & Medsos
      ['KONTAK', 'Nama Kontak Utama', sd.primaryContactName || '-', ''],
      ['KONTAK', 'Hubungan Kontak', sd.primaryContactRelation || '-', ''],
      ['KONTAK', 'No. WA Kontak', sd.primaryContactWhatsapp || reg.user?.phoneNumber || '-', ''],
      ['KONTAK', 'Email Kontak', sd.primaryContactEmail || reg.user?.email || '-', ''],

      // Kesehatan
      ['KESEHATAN', 'Riwayat Penyakit', sd.diseaseHistory || 'Tidak ada', ''],
      ['KESEHATAN', 'Riwayat Alergi', sd.allergyHistory || 'Tidak ada', ''],
      ['KESEHATAN', 'Riwayat Operasi', sd.surgeryHistory || 'Tidak ada', ''],
      ['KESEHATAN', 'Status Buta Warna', sd.colorBlindStatus || 'Tidak', ''],
      ['KESEHATAN', 'Kondisi Mata', `Minus L:${sd.eyeMinusLeft || 0} R:${sd.eyeMinusRight || 0}`, ''],
    ];

    rowsData.forEach((row, i) => {
      const addedRow = sheet.addRow(row);
      addedRow.height = 20;

      // Alternate background for categories
      if (i % 2 === 0) {
        addedRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        });
      }

      addedRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    // Sheet 2: DOKUMEN & PEMBAYARAN
    const docSheet = workbook.addWorksheet('DOKUMEN_DAN_PEMBAYARAN', {
      properties: { tabColor: { argb: '1E3A8A' } },
    });
    docSheet.views = [{ showGridLines: true }];
    docSheet.columns = [
      { key: 'col1', width: 22 },
      { key: 'col2', width: 35 },
      { key: 'col3', width: 25 },
      { key: 'col4', width: 20 },
    ];

    const docHead = docSheet.addRow(['TIPE BERKAS', 'NAMA FILE ASLI', 'UKURAN (BYTES)', 'TANGGAL UPLOAD']);
    docHead.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    docHead.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF065F46' },
    };

    if (reg.documents && reg.documents.length > 0) {
      reg.documents.forEach((d: any) => {
        docSheet.addRow([
          d.documentType,
          d.originalFileName || d.filePath,
          d.fileSize || 0,
          d.uploadedAt ? new Date(d.uploadedAt).toLocaleString('id-ID') : '-',
        ]);
      });
    } else {
      docSheet.addRow(['Tidak ada berkas yang diunggah', '-', '-', '-']);
    }

    docSheet.addRow([]);
    const payHead = docSheet.addRow(['TAGIHAN / PEMBAYARAN', 'JUMLAH (RP)', 'STATUS', 'TANGGAL']);
    payHead.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    payHead.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };

    if (reg.payments && reg.payments.length > 0) {
      reg.payments.forEach((p: any) => {
        docSheet.addRow([
          p.senderBank || 'Transfer Bank',
          Number(p.amount) || 0,
          p.status,
          p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('id-ID') : '-',
        ]);
      });
    } else {
      docSheet.addRow(['Belum ada catatan pembayaran', '-', '-', '-']);
    }

    const rawBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(rawBuffer);
  }

  /**
   * Helper to map DocumentType to human-readable label.
   */
  private getDocTypeLabel(docType: DocumentType): string {
    switch (docType) {
      case DocumentType.PHOTO:
        return 'Pas_Foto';
      case DocumentType.FAMILY_CARD:
        return 'Kartu_Keluarga';
      case DocumentType.BIRTH_CERTIFICATE:
        return 'Akta_Kelahiran';
      case DocumentType.DIPLOMA_OR_SKL:
        return 'Ijazah_SKL';
      case DocumentType.FATHER_ID_CARD:
        return 'KTP_Ayah';
      case DocumentType.MOTHER_ID_CARD:
        return 'KTP_Ibu';
      case DocumentType.GUARDIAN_ID_CARD:
        return 'KTP_Wali';
      case DocumentType.REPORT_CARD:
        return 'Buku_Rapor';
      case DocumentType.ACHIEVEMENT_CERTIFICATE:
        return 'Sertifikat_Prestasi';
      default:
        return `Dokumen_${docType}`;
    }
  }

  /**
   * Adds all student files (PDF, Excel, uploaded documents, payment proofs)
   * into an archiver instance under the student's prefix.
   */
  public async addStudentToArchive(
    archive: any,
    reg: any,
    insideFolder = '',
  ): Promise<void> {
    const prefix = this.getFilePrefix(reg);
    const folderPrefix = insideFolder ? `${insideFolder}/` : '';

    // 1. Generate & Append PDF Form
    try {
      const pdfBuffer = await this.generateStudentBiodataPdf(reg);
      archive.append(pdfBuffer, {
        name: `${folderPrefix}${prefix}_Formulir_Biodata.pdf`,
      });
    } catch (err) {
      this.logger.error(`Failed to append PDF for ${prefix}:`, err);
    }

    // 2. Generate & Append Excel Form
    try {
      const excelBuffer = await this.generateStudentBiodataExcel(reg);
      archive.append(excelBuffer, {
        name: `${folderPrefix}${prefix}_Formulir_Biodata.xlsx`,
      });
    } catch (err) {
      this.logger.error(`Failed to append Excel for ${prefix}:`, err);
    }

    // 3. Append Uploaded Registration Documents
    if (reg.documents && reg.documents.length > 0) {
      const typeCounts: Record<string, number> = {};

      for (const doc of reg.documents) {
        const docLabel = this.getDocTypeLabel(doc.documentType);
        typeCounts[docLabel] = (typeCounts[docLabel] || 0) + 1;
        const countSuffix =
          typeCounts[docLabel] > 1 ? `_${typeCounts[docLabel]}` : '';

        // Extract extension from originalFileName or filePath
        let ext = path.extname(doc.originalFileName || doc.filePath) || '.pdf';
        if (!ext.startsWith('.')) ext = `.${ext}`;

        const diskPath = path.join(this.docsDir, doc.filePath);
        if (fs.existsSync(diskPath)) {
          const stream = fs.createReadStream(diskPath);
          archive.append(stream, {
            name: `${folderPrefix}${prefix}_${docLabel}${countSuffix}${ext}`,
          });
        }
      }
    }

    // 4. Append Payment Proofs
    if (reg.payments && reg.payments.length > 0) {
      reg.payments.forEach((p: any, idx: number) => {
        if (p.proofImagePath) {
          const sanitizedFilename = path.basename(p.proofImagePath);
          const paymentPath = path.join(this.paymentProofsDir, sanitizedFilename);
          if (fs.existsSync(paymentPath)) {
            let ext = path.extname(sanitizedFilename) || '.jpg';
            if (!ext.startsWith('.')) ext = `.${ext}`;
            const countSuffix = reg.payments.length > 1 ? `_${idx + 1}` : '';
            const stream = fs.createReadStream(paymentPath);
            archive.append(stream, {
              name: `${folderPrefix}${prefix}_Bukti_Pembayaran${countSuffix}${ext}`,
            });
          }
        }
      });
    }
  }

  /**
   * Generates a single student ZIP as a Buffer.
   */
  public async buildStudentZipBuffer(reg: any): Promise<{ filename: string; buffer: Buffer }> {
    const prefix = this.getFilePrefix(reg);
    const filename = `${prefix}.zip`;

    return new Promise(async (resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 6 } });
      const buffers: Buffer[] = [];

      archive.on('data', (data: any) => buffers.push(data));
      archive.on('end', () => {
        resolve({
          filename,
          buffer: Buffer.concat(buffers),
        });
      });
      archive.on('error', (err: any) => reject(err));

      await this.addStudentToArchive(archive, reg);
      await archive.finalize();
    });
  }

  /**
   * Streams single student ZIP directly to HTTP response.
   */
  public async streamSingleStudentZip(
    id: string,
    res: Response,
    userId?: string,
  ): Promise<void> {
    const reg = await this.getFullRegistration(id);
    const prefix = this.getFilePrefix(reg);
    const filename = `${prefix}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('error', (err: any) => {
      this.logger.error(`Archive streaming error for ${filename}:`, err);
      if (!res.headersSent) {
        res.status(500).send('Terjadi kesalahan saat membuat file ZIP.');
      }
    });

    archive.pipe(res);
    await this.addStudentToArchive(archive, reg);
    await archive.finalize();

    // Log audit
    if (userId) {
      await this.auditService.log({
        userId,
        action: 'DOWNLOAD_STUDENT_DATA_ZIP',
        targetTable: 'registrations',
        targetId: reg.id,
        details: `Downloaded single ZIP archive ${filename}`,
      });
    }
  }

  /**
   * Streams batch ZIP containing individual student ZIP files (1 zip per student).
   */
  public async streamBatchZip(
    filter: ExportFilterDto,
    res: Response,
    userId?: string,
  ): Promise<void> {
    const where = this.buildWhereClause(filter);

    const students = await this.prisma.registration.findMany({
      where,
      orderBy: { registrationNumber: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
        classProgram: {
          include: {
            major: {
              include: {
                school: true,
              },
            },
          },
        },
        academicPeriod: true,
        admissionWave: true,
        studentDetail: true,
        achievements: true,
        documents: true,
        payments: true,
        verifiedBy: { select: { id: true, name: true } },
      },
    });

    if (students.length === 0) {
      throw new BadRequestException('Tidak ada data santri yang memenuhi kriteria filter.');
    }

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const masterFilename = `DOWNLOAD_DATA_PSB_${students.length}_SANTRI_${timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${masterFilename}"`,
    );

    const masterArchive = archiver('zip', { zlib: { level: 6 } });

    masterArchive.on('error', (err: any) => {
      this.logger.error(`Master archive error:`, err);
      if (!res.headersSent) {
        res.status(500).send('Terjadi kesalahan saat membuat file arsip masal.');
      }
    });

    masterArchive.pipe(res);

    // For each student, generate their individual ZIP and append it to master archive!
    for (const student of students) {
      try {
        const studentZip = await this.buildStudentZipBuffer(student);
        masterArchive.append(studentZip.buffer, { name: studentZip.filename });
      } catch (err) {
        this.logger.error(`Failed to package student ${student.registrationNumber}:`, err);
      }
    }

    await masterArchive.finalize();

    // Audit log
    if (userId) {
      await this.auditService.log({
        userId,
        action: 'BATCH_DOWNLOAD_STUDENT_DATA_ZIP',
        targetTable: 'registrations',
        details: `Batch downloaded ${students.length} student ZIPs matching filter.`,
      });
    }
  }
}
