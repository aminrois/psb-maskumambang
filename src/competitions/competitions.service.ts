import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  CreateMajorDto,
  UpdateMajorDto,
  CreateClassProgramDto,
  UpdateClassProgramDto,
} from './dto/competition.dto';

@Injectable()
export class CompetitionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns active PSB hierarchy (School -> Major -> ClassProgram).
   */
  async getTree() {
    const schools = await this.prisma.school.findMany({
      where: { isActive: true },
      include: {
        majors: {
          include: {
            classPrograms: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
              include: {
                _count: {
                  select: { registrations: true },
                },
                registrations: {
                  where: { status: 'APPROVED' },
                  select: { id: true },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return schools.map(sch => ({
      ...sch,
      // Provide compatibility properties so both 'levels/branches' and 'majors/classPrograms' work
      majors: sch.majors.map(maj => ({
        ...maj,
        classPrograms: maj.classPrograms.map(cp => ({
          ...cp,
          verifiedCount: cp.registrations ? cp.registrations.length : 0,
          registrations: undefined,
        })),
        branches: maj.classPrograms.map(cp => ({
          ...cp,
          verifiedCount: cp.registrations ? cp.registrations.length : 0,
          registrations: undefined,
        })),
      })),
      levels: sch.majors.map(maj => ({
        ...maj,
        classPrograms: maj.classPrograms.map(cp => ({
          ...cp,
          verifiedCount: cp.registrations ? cp.registrations.length : 0,
          registrations: undefined,
        })),
        branches: maj.classPrograms.map(cp => ({
          ...cp,
          verifiedCount: cp.registrations ? cp.registrations.length : 0,
          registrations: undefined,
        })),
      })),
    }));
  }

  /**
   * Retrieves specific ClassProgram details with its parent Major and School.
   */
  async getBranchDetail(id: string) {
    const classProgram = await this.prisma.classProgram.findUnique({
      where: { id },
      include: {
        major: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!classProgram) {
      throw new NotFoundException('Program kelas tidak ditemukan.');
    }

    return {
      ...classProgram,
      level: {
        ...classProgram.major,
        category: classProgram.major.school,
      },
    };
  }

  /**
   * Validates cross-check hierarchy:
   * Ensures classProgram belongs to major, and major belongs to school.
   */
  async validateHierarchy(
    schoolId?: string,
    majorId?: string,
    classProgramId?: string,
  ): Promise<boolean> {
    if (classProgramId) {
      const cp = await this.prisma.classProgram.findUnique({
        where: { id: classProgramId },
        include: { major: true },
      });

      if (!cp) {
        throw new NotFoundException('Program kelas tidak ditemukan.');
      }

      if (!cp.isActive) {
        throw new BadRequestException('Program kelas ini sedang tidak aktif.');
      }

      if (majorId && cp.majorId !== majorId) {
        throw new BadRequestException(
          'Inkonsistensi data: Program kelas tidak terdaftar pada jurusan yang dipilih.',
        );
      }

      if (schoolId && cp.major.schoolId !== schoolId) {
        throw new BadRequestException(
          'Inkonsistensi data: Jurusan tidak terdaftar pada sekolah yang dipilih.',
        );
      }
    } else if (majorId && schoolId) {
      const major = await this.prisma.major.findUnique({
        where: { id: majorId },
      });

      if (!major) {
        throw new NotFoundException('Jurusan tidak ditemukan.');
      }

      if (major.schoolId !== schoolId) {
        throw new BadRequestException(
          'Inkonsistensi data: Jurusan tidak terdaftar pada sekolah yang dipilih.',
        );
      }
    }

    return true;
  }

  // --- School (Sekolah) Management ---

  async getAllCategories() {
    return this.prisma.school.findMany({
      include: {
        majors: {
          include: {
            classPrograms: {
              orderBy: { name: 'asc' },
            },
            _count: {
              select: { classPrograms: true },
            },
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { majors: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateSchoolDto) {
    const existing = await this.prisma.school.findFirst({
      where: {
        OR: [{ name: dto.name.trim() }, { slug: dto.slug.trim() }],
      },
    });

    if (existing) {
      throw new ConflictException('Sekolah dengan nama atau slug ini sudah ada.');
    }

    return this.prisma.school.create({
      data: {
        name: dto.name.trim(),
        slug: dto.slug.trim(),
        initial: dto.initial?.trim().toUpperCase() || undefined,
        description: dto.description?.trim(),
        isActive: true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateSchoolDto) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) {
      throw new NotFoundException('Sekolah tidak ditemukan.');
    }

    return this.prisma.school.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        slug: dto.slug?.trim(),
        initial: dto.initial !== undefined ? dto.initial.trim().toUpperCase() : undefined,
        description: dto.description?.trim(),
      },
    });
  }

  async toggleCategory(id: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) {
      throw new NotFoundException('Sekolah tidak ditemukan.');
    }

    return this.prisma.school.update({
      where: { id },
      data: { isActive: !school.isActive },
    });
  }

  async deleteCategory(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: { _count: { select: { majors: true } } },
    });

    if (!school) {
      throw new NotFoundException('Sekolah tidak ditemukan.');
    }

    if (school._count.majors > 0) {
      throw new BadRequestException('Sekolah tidak dapat dihapus karena masih memiliki jurusan terdaftar.');
    }

    return this.prisma.school.delete({ where: { id } });
  }

  // --- Major (Jurusan) Management ---

  async getLevelsByCategory(schoolId: string) {
    return this.prisma.major.findMany({
      where: { schoolId },
      include: {
        _count: {
          select: { classPrograms: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createLevel(dto: CreateMajorDto) {
    const targetSchoolId = dto.schoolId || dto.categoryId;
    if (!targetSchoolId) {
      throw new BadRequestException('ID Sekolah wajib diisi.');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: targetSchoolId },
    });

    if (!school) {
      throw new NotFoundException('Sekolah induk tidak ditemukan.');
    }

    const existing = await this.prisma.major.findFirst({
      where: {
        schoolId: targetSchoolId,
        name: dto.name.trim(),
      },
    });

    if (existing) {
      throw new ConflictException('Jurusan dengan nama ini sudah terdaftar pada sekolah tersebut.');
    }

    return this.prisma.major.create({
      data: {
        schoolId: targetSchoolId,
        name: dto.name.trim(),
        slug: dto.slug.trim(),
      },
    });
  }

  async updateLevel(id: string, dto: UpdateMajorDto) {
    const major = await this.prisma.major.findUnique({ where: { id } });
    if (!major) {
      throw new NotFoundException('Jurusan tidak ditemukan.');
    }

    return this.prisma.major.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        slug: dto.slug?.trim(),
      },
    });
  }

  async getAllLevels() {
    const majors = await this.prisma.major.findMany({
      include: {
        school: true,
        _count: {
          select: { classPrograms: true },
        },
      },
      orderBy: [
        { school: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    return majors.map(m => ({
      ...m,
      category: m.school,
      categoryId: m.schoolId,
    }));
  }

  async deleteLevel(id: string) {
    const major = await this.prisma.major.findUnique({
      where: { id },
      include: { _count: { select: { classPrograms: true } } },
    });

    if (!major) {
      throw new NotFoundException('Jurusan tidak ditemukan.');
    }

    if (major._count.classPrograms > 0) {
      throw new BadRequestException('Jurusan tidak dapat dihapus karena masih memiliki program kelas terdaftar.');
    }

    return this.prisma.major.delete({ where: { id } });
  }

  // --- Class Program (Program Kelas) Management ---

  async getBranchesByLevel(majorId: string) {
    return this.prisma.classProgram.findMany({
      where: { majorId },
      orderBy: { name: 'asc' },
    });
  }

  async createBranch(dto: CreateClassProgramDto) {
    const targetMajorId = dto.majorId || dto.levelId;
    if (!targetMajorId) {
      throw new BadRequestException('ID Jurusan wajib diisi.');
    }

    const major = await this.prisma.major.findUnique({
      where: { id: targetMajorId },
    });

    if (!major) {
      throw new NotFoundException('Jurusan induk tidak ditemukan.');
    }

    const existing = await this.prisma.classProgram.findFirst({
      where: {
        majorId: targetMajorId,
        name: dto.name.trim(),
      },
    });

    if (existing) {
      throw new ConflictException('Program kelas ini sudah terdaftar pada jurusan tersebut.');
    }

    return this.prisma.classProgram.create({
      data: {
        majorId: targetMajorId,
        name: dto.name.trim(),
        participantType: dto.participantType || 'INDIVIDUAL',
        registrationFee: dto.registrationFee ?? 0,
        description: dto.description?.trim(),
        juknisUrl: dto.juknisUrl?.trim() || null,
        maxRegistrants: dto.maxRegistrants ?? null,
        isActive: true,
      },
    });
  }

  async updateBranch(id: string, dto: UpdateClassProgramDto) {
    const cp = await this.prisma.classProgram.findUnique({ where: { id } });
    if (!cp) {
      throw new NotFoundException('Program kelas tidak ditemukan.');
    }

    return this.prisma.classProgram.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        participantType: dto.participantType,
        registrationFee: dto.registrationFee,
        description: dto.description?.trim(),
        juknisUrl: dto.juknisUrl !== undefined ? (dto.juknisUrl?.trim() || null) : undefined,
        maxRegistrants: dto.maxRegistrants !== undefined ? (dto.maxRegistrants ?? null) : undefined,
      },
    });
  }

  async getAllBranches() {
    const cps = await this.prisma.classProgram.findMany({
      include: {
        major: {
          include: {
            school: true,
          },
        },
      },
      orderBy: [
        { major: { school: { name: 'asc' } } },
        { major: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    return cps.map(cp => ({
      ...cp,
      levelId: cp.majorId,
      level: {
        ...cp.major,
        category: cp.major.school,
        categoryId: cp.major.schoolId,
      },
    }));
  }

  async deleteBranch(id: string) {
    const cp = await this.prisma.classProgram.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } },
    });

    if (!cp) {
      throw new NotFoundException('Program kelas tidak ditemukan.');
    }

    if (cp._count.registrations > 0) {
      return this.prisma.classProgram.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.classProgram.delete({ where: { id } });
  }

  async toggleBranch(id: string) {
    const cp = await this.prisma.classProgram.findUnique({ where: { id } });
    if (!cp) {
      throw new NotFoundException('Program kelas tidak ditemukan.');
    }

    return this.prisma.classProgram.update({
      where: { id },
      data: { isActive: !cp.isActive },
    });
  }

  // =========================================================================
  // ACADEMIC PERIODS (PERIODE TAHUN PELAJARAN)
  // =========================================================================
  async getAllPeriods() {
    return this.prisma.academicPeriod.findMany({
      include: {
        admissionWaves: {
          orderBy: { startDate: 'asc' },
        },
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: { name: 'desc' },
    });
  }

  async getActivePeriod() {
    const period = await this.prisma.academicPeriod.findFirst({
      where: { isActive: true },
    });

    if (!period) {
      return null;
    }

    const activeWaves = await this.getActiveWaves();

    return {
      ...period,
      availableWaves: activeWaves,
    };
  }

  async createPeriod(dto: any) {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Nama periode wajib diisi.');
    }

    const existing = await this.prisma.academicPeriod.findUnique({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(`Periode tahun pelajaran "${name}" sudah ada.`);
    }

    if (dto.isActive) {
      return this.prisma.$transaction(async (tx) => {
        await tx.academicPeriod.updateMany({
          data: { isActive: false },
        });
        return tx.academicPeriod.create({
          data: {
            name,
            isActive: true,
          },
        });
      });
    }

    return this.prisma.academicPeriod.create({
      data: {
        name,
        isActive: false,
      },
    });
  }

  async updatePeriod(id: string, dto: any) {
    const period = await this.prisma.academicPeriod.findUnique({ where: { id } });
    if (!period) {
      throw new NotFoundException('Periode tahun pelajaran tidak ditemukan.');
    }

    if (dto.name && dto.name.trim() !== period.name) {
      const existing = await this.prisma.academicPeriod.findUnique({
        where: { name: dto.name.trim() },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Periode tahun pelajaran "${dto.name.trim()}" sudah ada.`);
      }
    }

    if (dto.isActive === true && !period.isActive) {
      return this.prisma.$transaction(async (tx) => {
        await tx.academicPeriod.updateMany({
          data: { isActive: false },
        });
        return tx.academicPeriod.update({
          where: { id },
          data: {
            name: dto.name?.trim() || period.name,
            isActive: true,
          },
        });
      });
    }

    return this.prisma.academicPeriod.update({
      where: { id },
      data: {
        name: dto.name?.trim() || period.name,
        isActive: dto.isActive !== undefined ? dto.isActive : period.isActive,
      },
    });
  }

  async togglePeriod(id: string) {
    const period = await this.prisma.academicPeriod.findUnique({ where: { id } });
    if (!period) {
      throw new NotFoundException('Periode tahun pelajaran tidak ditemukan.');
    }

    const nextActive = !period.isActive;
    if (nextActive) {
      return this.prisma.$transaction(async (tx) => {
        await tx.academicPeriod.updateMany({
          data: { isActive: false },
        });
        return tx.academicPeriod.update({
          where: { id },
          data: { isActive: true },
        });
      });
    }

    return this.prisma.academicPeriod.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async deletePeriod(id: string) {
    const period = await this.prisma.academicPeriod.findUnique({
      where: { id },
      include: {
        _count: { select: { registrations: true, admissionWaves: true } },
      },
    });

    if (!period) {
      throw new NotFoundException('Periode tahun pelajaran tidak ditemukan.');
    }

    if (period._count.registrations > 0) {
      throw new BadRequestException(
        'Periode tidak dapat dihapus karena sudah memiliki data pendaftaran. Nonaktifkan saja periode ini.',
      );
    }

    return this.prisma.academicPeriod.delete({ where: { id } });
  }

  // =========================================================================
  // ADMISSION WAVES (GELOMBANG / KUOTA PENDAFTARAN)
  // =========================================================================
  private async formatWavesWithQuotas(waves: any[]) {
    if (!waves || waves.length === 0) return [];
    const waveIds = waves.map((w) => w.id);

    const verifiedRegs = await this.prisma.registration.findMany({
      where: {
        admissionWaveId: { in: waveIds },
        payments: {
          some: { status: PaymentStatus.APPROVED },
        },
      },
      select: {
        admissionWaveId: true,
        classProgram: {
          select: {
            major: {
              select: {
                schoolId: true,
              },
            },
          },
        },
      },
    });

    const totalRegs = await this.prisma.registration.findMany({
      where: {
        admissionWaveId: { in: waveIds },
      },
      select: {
        admissionWaveId: true,
        classProgram: {
          select: {
            major: {
              select: {
                schoolId: true,
              },
            },
          },
        },
      },
    });

    const verifiedWaveMap = new Map<string, number>();
    const totalWaveMap = new Map<string, number>();
    const verifiedSchoolMap = new Map<string, number>();
    const totalSchoolMap = new Map<string, number>();

    for (const r of verifiedRegs) {
      if (r.admissionWaveId) {
        verifiedWaveMap.set(r.admissionWaveId, (verifiedWaveMap.get(r.admissionWaveId) || 0) + 1);
        const sId = r.classProgram?.major?.schoolId;
        if (sId) {
          const key = `${r.admissionWaveId}_${sId}`;
          verifiedSchoolMap.set(key, (verifiedSchoolMap.get(key) || 0) + 1);
        }
      }
    }

    for (const r of totalRegs) {
      if (r.admissionWaveId) {
        totalWaveMap.set(r.admissionWaveId, (totalWaveMap.get(r.admissionWaveId) || 0) + 1);
        const sId = r.classProgram?.major?.schoolId;
        if (sId) {
          const key = `${r.admissionWaveId}_${sId}`;
          totalSchoolMap.set(key, (totalSchoolMap.get(key) || 0) + 1);
        }
      }
    }

    return waves.map((w) => {
      const verifiedCount = verifiedWaveMap.get(w.id) || 0;
      const totalCount = totalWaveMap.get(w.id) || (w._count?.registrations || 0);

      const schoolQuotasFormatted = (w.schoolQuotas || []).map((sq: any) => {
        const vCount = verifiedSchoolMap.get(`${w.id}_${sq.schoolId}`) || 0;
        const tCount = totalSchoolMap.get(`${w.id}_${sq.schoolId}`) || 0;
        const qVal = sq.quota || 0;
        const remaining = Math.max(0, qVal - vCount);
        const isFull = qVal > 0 && vCount >= qVal;
        return {
          id: sq.id,
          schoolId: sq.schoolId,
          schoolName: sq.school?.name || '',
          schoolInitial: sq.school?.initial || '',
          quota: qVal,
          verifiedCount: vCount,
          totalCount: tCount,
          remainingQuota: remaining,
          isFull,
        };
      });

      let totalSchoolQuotaSum = 0;
      if (schoolQuotasFormatted.length > 0) {
        totalSchoolQuotaSum = schoolQuotasFormatted.reduce(
          (acc: number, curr: any) => acc + (curr.quota || 0),
          0,
        );
      }
      const effectiveQuota = totalSchoolQuotaSum > 0 ? totalSchoolQuotaSum : w.quota;

      const remainingQuota =
        effectiveQuota !== null && effectiveQuota !== undefined
          ? Math.max(0, effectiveQuota - verifiedCount)
          : null;
      const isFull =
        effectiveQuota !== null && effectiveQuota !== undefined && effectiveQuota > 0
          ? verifiedCount >= effectiveQuota
          : false;

      return {
        ...w,
        quota: effectiveQuota,
        schoolQuotas: schoolQuotasFormatted,
        verifiedCount,
        totalCount,
        remainingQuota,
        isFull,
      };
    });
  }

  async getAllWaves() {
    const waves = await this.prisma.admissionWave.findMany({
      include: {
        academicPeriod: true,
        schoolQuotas: {
          include: {
            school: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: [{ academicPeriod: { name: 'desc' } }, { startDate: 'asc' }],
    });

    return this.formatWavesWithQuotas(waves);
  }

  async getWavesByPeriod(academicPeriodId: string) {
    const waves = await this.prisma.admissionWave.findMany({
      where: { academicPeriodId },
      include: {
        academicPeriod: true,
        schoolQuotas: {
          include: {
            school: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return this.formatWavesWithQuotas(waves);
  }

  async getActiveWaves() {
    const activePeriod = await this.prisma.academicPeriod.findFirst({
      where: { isActive: true },
    });
    if (!activePeriod) return [];

    const now = new Date();
    const waves = await this.prisma.admissionWave.findMany({
      where: {
        academicPeriodId: activePeriod.id,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        academicPeriod: true,
        schoolQuotas: {
          include: {
            school: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return this.formatWavesWithQuotas(waves);
  }

  async createWave(dto: any) {
    if (!dto.academicPeriodId) {
      throw new BadRequestException('Periode tahun pelajaran wajib dipilih.');
    }

    const period = await this.prisma.academicPeriod.findUnique({
      where: { id: dto.academicPeriodId },
    });
    if (!period) {
      throw new BadRequestException('Periode tahun pelajaran tidak valid.');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Format tanggal mulai atau tanggal berakhir tidak valid.');
    }
    if (start >= end) {
      throw new BadRequestException('Tanggal mulai gelombang harus sebelum tanggal berakhir.');
    }

    const fee = Number(dto.registrationFee);
    if (isNaN(fee) || fee < 0) {
      throw new BadRequestException('Biaya pendaftaran tidak boleh negatif.');
    }

    let quotaVal: number | null = null;
    if (dto.quota !== undefined && dto.quota !== null && dto.quota !== '') {
      const q = Number(dto.quota);
      if (isNaN(q) || q < 0) {
        throw new BadRequestException('Kuota pendaftaran tidak boleh bernilai negatif.');
      }
      quotaVal = q;
    }

    const created = await this.prisma.admissionWave.create({
      data: {
        academicPeriodId: dto.academicPeriodId,
        name: dto.name.trim(),
        waveNumber: dto.waveNumber ? Number(dto.waveNumber) : null,
        startDate: start,
        endDate: end,
        registrationFee: fee,
        quota: quotaVal,
        isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
      },
      include: {
        academicPeriod: true,
        schoolQuotas: true,
      },
    });

    // Save school quotas if provided
    if (Array.isArray(dto.schoolQuotas) && dto.schoolQuotas.length > 0) {
      for (const sq of dto.schoolQuotas) {
        if (sq.schoolId && sq.quota !== undefined && sq.quota !== null && sq.quota !== '') {
          const q = Number(sq.quota);
          if (!isNaN(q) && q >= 0) {
            await this.prisma.admissionWaveSchoolQuota.create({
              data: {
                admissionWaveId: created.id,
                schoolId: sq.schoolId,
                quota: q,
              },
            });
          }
        }
      }
    }

    return this.prisma.admissionWave.findUnique({
      where: { id: created.id },
      include: {
        academicPeriod: true,
        schoolQuotas: { include: { school: true } },
      },
    });
  }

  async updateWave(id: string, dto: any) {
    const wave = await this.prisma.admissionWave.findUnique({ where: { id } });
    if (!wave) {
      throw new NotFoundException('Gelombang pendaftaran tidak ditemukan.');
    }

    let start = wave.startDate;
    let end = wave.endDate;

    if (dto.startDate) {
      start = new Date(dto.startDate);
      if (isNaN(start.getTime())) throw new BadRequestException('Format tanggal mulai tidak valid.');
    }
    if (dto.endDate) {
      end = new Date(dto.endDate);
      if (isNaN(end.getTime())) throw new BadRequestException('Format tanggal berakhir tidak valid.');
    }

    if (start >= end) {
      throw new BadRequestException('Tanggal mulai gelombang harus sebelum tanggal berakhir.');
    }

    let fee = wave.registrationFee;
    if (dto.registrationFee !== undefined) {
      const f = Number(dto.registrationFee);
      if (isNaN(f) || f < 0) throw new BadRequestException('Biaya pendaftaran tidak boleh negatif.');
      fee = f as any;
    }

    let quotaVal = wave.quota;
    if (dto.quota !== undefined) {
      if (dto.quota === null || dto.quota === '') {
        quotaVal = null;
      } else {
        const q = Number(dto.quota);
        if (isNaN(q) || q < 0) {
          throw new BadRequestException('Kuota pendaftaran tidak boleh bernilai negatif.');
        }
        quotaVal = q;
      }
    }

    await this.prisma.admissionWave.update({
      where: { id },
      data: {
        academicPeriodId: dto.academicPeriodId || wave.academicPeriodId,
        name: dto.name ? dto.name.trim() : wave.name,
        waveNumber: dto.waveNumber !== undefined ? (dto.waveNumber ? Number(dto.waveNumber) : null) : wave.waveNumber,
        startDate: start,
        endDate: end,
        registrationFee: fee,
        quota: quotaVal,
        isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : wave.isActive,
      },
    });

    // Update school quotas if provided
    if (Array.isArray(dto.schoolQuotas)) {
      await this.prisma.admissionWaveSchoolQuota.deleteMany({
        where: { admissionWaveId: id },
      });
      for (const sq of dto.schoolQuotas) {
        if (sq.schoolId && sq.quota !== undefined && sq.quota !== null && sq.quota !== '') {
          const q = Number(sq.quota);
          if (!isNaN(q) && q >= 0) {
            await this.prisma.admissionWaveSchoolQuota.create({
              data: {
                admissionWaveId: id,
                schoolId: sq.schoolId,
                quota: q,
              },
            });
          }
        }
      }
    }

    return this.prisma.admissionWave.findUnique({
      where: { id },
      include: {
        academicPeriod: true,
        schoolQuotas: { include: { school: true } },
      },
    });
  }

  async toggleWave(id: string) {
    const wave = await this.prisma.admissionWave.findUnique({ where: { id } });
    if (!wave) {
      throw new NotFoundException('Gelombang pendaftaran tidak ditemukan.');
    }

    return this.prisma.admissionWave.update({
      where: { id },
      data: { isActive: !wave.isActive },
      include: { academicPeriod: true },
    });
  }

  async deleteWave(id: string) {
    const wave = await this.prisma.admissionWave.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } },
    });

    if (!wave) {
      throw new NotFoundException('Gelombang pendaftaran tidak ditemukan.');
    }

    if (wave._count.registrations > 0) {
      throw new BadRequestException(
        'Gelombang tidak dapat dihapus karena sudah memiliki data pendaftaran. Nonaktifkan saja gelombang ini.',
      );
    }

    return this.prisma.admissionWave.delete({ where: { id } });
  }
}

