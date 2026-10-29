import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreatePracticalScheduleDto,
  UpdatePracticalScheduleDto,
  AssignExaminersDto,
  AssignPracticalParticipantsDto,
  MovePracticalParticipantScheduleDto,
  SubmitPracticalScoreDto,
  PracticalCandidateFilterDto,
} from './dto/practical-test.dto';
import {
  PracticalScheduleStatus,
  PracticalTestStatus,
  Role,
  CBTAttemptStatus,
  CBTGradingStatus,
} from '@prisma/client';

@Injectable()
export class PracticalTestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  static readonly SCORE_LABELS: Record<number, string> = {
    1: 'Belum bisa',
    2: 'Bisa',
    3: 'Bisa melakukan, butuh Kontrol',
    4: 'Mampu Secara Mandiri & Istiqomah',
  };

  // =========================================================================
  // 1. STATISTIK DASHBOARD (ADMIN & EXAMINER)
  // =========================================================================
  async getDashboardStats(academicPeriodId?: string) {
    const periodWhere: any = {};
    if (academicPeriodId) {
      periodWhere.academicPeriodId = academicPeriodId;
    }

    const [
      totalEligible,
      totalScheduled,
      totalCompleted,
      totalSchedules,
      activeSchedules,
      totalExaminers,
    ] = await Promise.all([
      this.prisma.registration.count({
        where: {
          formStatus: 'VERIFIED',
          ...periodWhere,
        },
      }),
      this.prisma.practicalTest.count({
        where: {
          status: PracticalTestStatus.SCHEDULED,
          registration: periodWhere,
        },
      }),
      this.prisma.practicalTest.count({
        where: {
          status: PracticalTestStatus.COMPLETED,
          registration: periodWhere,
        },
      }),
      this.prisma.practicalSchedule.count({
        where: periodWhere,
      }),
      this.prisma.practicalSchedule.count({
        where: {
          status: PracticalScheduleStatus.ACTIVE,
          ...periodWhere,
        },
      }),
      this.prisma.user.count({
        where: {
          role: Role.PETUGAS_TES_PRAKTIK,
          isActive: true,
        },
      }),
    ]);

    const totalUnscheduled = Math.max(
      0,
      totalEligible - (totalScheduled + totalCompleted),
    );

    // Averages
    const completedList = await this.prisma.practicalTest.findMany({
      where: {
        status: PracticalTestStatus.COMPLETED,
        registration: periodWhere,
      },
      select: {
        btqScore: true,
        wudhuScore: true,
        salatScore: true,
        totalScore: true,
      },
    });

    let avgBtq = 0;
    let avgWudhu = 0;
    let avgSalat = 0;
    let avgTotal = 0;

    if (completedList.length > 0) {
      const sumBtq = completedList.reduce((acc, curr) => acc + (curr.btqScore || 0), 0);
      const sumWudhu = completedList.reduce((acc, curr) => acc + (curr.wudhuScore || 0), 0);
      const sumSalat = completedList.reduce((acc, curr) => acc + (curr.salatScore || 0), 0);
      const sumTotal = completedList.reduce((acc, curr) => acc + Number(curr.totalScore || 0), 0);

      avgBtq = +(sumBtq / completedList.length).toFixed(2);
      avgWudhu = +(sumWudhu / completedList.length).toFixed(2);
      avgSalat = +(sumSalat / completedList.length).toFixed(2);
      avgTotal = +(sumTotal / completedList.length).toFixed(2);
    }

    return {
      success: true,
      data: {
        totalEligible,
        totalUnscheduled,
        totalScheduled,
        totalCompleted,
        totalSchedules,
        activeSchedules,
        totalExaminers,
        averages: {
          btq: avgBtq,
          wudhu: avgWudhu,
          salat: avgSalat,
          total: avgTotal,
        },
      },
    };
  }

  // =========================================================================
  // 2. KELOLA JADWAL TES PRAKTIK (ADMIN & SUPER ADMIN)
  // =========================================================================
  async listSchedules(query: {
    academicPeriodId?: string;
    admissionWaveId?: string;
    schoolId?: string;
    status?: PracticalScheduleStatus;
    search?: string;
  }) {
    const where: any = {};
    if (query.academicPeriodId) where.academicPeriodId = query.academicPeriodId;
    if (query.admissionWaveId) where.admissionWaveId = query.admissionWaveId;
    if (query.schoolId) where.schoolId = query.schoolId;
    if (query.status) where.status = query.status;
    if (query.search?.trim()) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { roomLocation: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const schedules = await this.prisma.practicalSchedule.findMany({
      where,
      orderBy: [{ scheduleDate: 'desc' }, { startTime: 'asc' }],
      include: {
        academicPeriod: true,
        admissionWave: true,
        school: true,
        major: true,
        classProgram: true,
        examiners: {
          include: {
            examiner: {
              select: { id: true, name: true, email: true, phoneNumber: true },
            },
          },
        },
        tests: {
          select: {
            id: true,
            status: true,
            totalScore: true,
          },
        },
      },
    });

    const data = schedules.map((s) => {
      const assignedCount = s.tests.length;
      const completedCount = s.tests.filter(
        (t) => t.status === PracticalTestStatus.COMPLETED,
      ).length;
      return {
        id: s.id,
        name: s.name || `Jadwal Praktik ${s.roomLocation}`,
        scheduleDate: s.scheduleDate,
        startTime: s.startTime,
        endTime: s.endTime,
        roomLocation: s.roomLocation,
        quota: s.quota,
        notes: s.notes,
        status: s.status,
        periodName: s.academicPeriod?.name || '-',
        waveName: s.admissionWave?.name || '-',
        schoolName: s.school?.name || 'Semua Unit',
        majorName: s.major?.name || 'Semua Jurusan',
        className: s.classProgram?.name || 'Semua Kelas',
        examiners: s.examiners.map((e) => e.examiner),
        assignedCount,
        completedCount,
        remainingQuota: Math.max(0, s.quota - assignedCount),
      };
    });

    return { success: true, data };
  }

  async getScheduleDetail(id: string) {
    const s = await this.prisma.practicalSchedule.findUnique({
      where: { id },
      include: {
        academicPeriod: true,
        admissionWave: true,
        school: true,
        major: true,
        classProgram: true,
        examiners: {
          include: {
            examiner: {
              select: { id: true, name: true, email: true, phoneNumber: true },
            },
          },
        },
        tests: {
          include: {
            registration: {
              include: {
                studentDetail: true,
                individualParticipant: true,
                classProgram: {
                  include: { major: { include: { school: true } } },
                },
                cbtAttempt: true,
              },
            },
            examiner: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });

    if (!s) {
      throw new NotFoundException('Jadwal tes praktik tidak ditemukan.');
    }

    const participants = s.tests.map((t) => {
      const reg = t.registration;
      return {
        testId: t.id,
        registrationId: reg.id,
        registrationNumber: reg.registrationNumber,
        studentName:
          reg.studentDetail?.fullName ||
          reg.individualParticipant?.fullName ||
          'Calon Santri',
        gender:
          reg.studentDetail?.gender ||
          reg.individualParticipant?.gender ||
          '-',
        nisn: reg.studentDetail?.nisn || '-',
        schoolName: reg.classProgram?.major?.school?.name || '-',
        className: reg.classProgram?.name || '-',
        cbtScore: reg.cbtAttempt?.totalScore
          ? Number(reg.cbtAttempt.totalScore)
          : null,
        cbtStatus: reg.cbtAttempt?.verificationStatus || reg.cbtAttempt?.status || '-',
        practicalStatus: t.status,
        btqScore: t.btqScore,
        wudhuScore: t.wudhuScore,
        salatScore: t.salatScore,
        totalScore: t.totalScore ? Number(t.totalScore) : null,
        examinerName: t.examinerName || t.examiner?.name || '-',
        testedAt: t.testedAt,
      };
    });

    return {
      success: true,
      data: {
        id: s.id,
        name: s.name,
        academicPeriodId: s.academicPeriodId,
        admissionWaveId: s.admissionWaveId,
        schoolId: s.schoolId,
        majorId: s.majorId,
        classProgramId: s.classProgramId,
        scheduleDate: s.scheduleDate,
        startTime: s.startTime,
        endTime: s.endTime,
        roomLocation: s.roomLocation,
        quota: s.quota,
        notes: s.notes,
        status: s.status,
        examiners: s.examiners.map((e) => e.examiner),
        participants,
      },
    };
  }

  async createSchedule(dto: CreatePracticalScheduleDto) {
    const room = (dto.roomLocation || dto.room || 'Ruang Penguji').trim();
    const examinerIds = dto.examinerUserIds || dto.examinerIds || [];

    const schedule = await this.prisma.practicalSchedule.create({
      data: {
        name: dto.name || `Sesi Praktik ${room}`,
        academicPeriodId: dto.academicPeriodId,
        admissionWaveId: dto.admissionWaveId,
        schoolId: dto.schoolId,
        majorId: dto.majorId,
        classProgramId: dto.classProgramId,
        scheduleDate: new Date(dto.scheduleDate),
        startTime: dto.startTime.trim(),
        endTime: dto.endTime.trim(),
        roomLocation: room,
        quota: dto.quota || 10,
        notes: dto.notes?.trim() || null,
        status: dto.status || PracticalScheduleStatus.ACTIVE,
      },
    });

    if (examinerIds.length > 0) {
      await this.assignExaminers(schedule.id, {
        examinerUserIds: examinerIds,
      });
    }

    return {
      success: true,
      message: 'Jadwal tes praktik berhasil dibuat.',
      data: schedule,
    };
  }

  async updateSchedule(id: string, dto: UpdatePracticalScheduleDto) {
    const existing = await this.prisma.practicalSchedule.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Jadwal tes praktik tidak ditemukan.');
    }

    const room = dto.roomLocation || dto.room;
    const examinerIds = dto.examinerUserIds || dto.examinerIds;

    const updated = await this.prisma.practicalSchedule.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name : existing.name,
        academicPeriodId:
          dto.academicPeriodId !== undefined
            ? dto.academicPeriodId
            : existing.academicPeriodId,
        admissionWaveId:
          dto.admissionWaveId !== undefined
            ? dto.admissionWaveId
            : existing.admissionWaveId,
        schoolId:
          dto.schoolId !== undefined ? dto.schoolId : existing.schoolId,
        majorId: dto.majorId !== undefined ? dto.majorId : existing.majorId,
        classProgramId:
          dto.classProgramId !== undefined
            ? dto.classProgramId
            : existing.classProgramId,
        scheduleDate: dto.scheduleDate
          ? new Date(dto.scheduleDate)
          : existing.scheduleDate,
        startTime: dto.startTime ? dto.startTime.trim() : existing.startTime,
        endTime: dto.endTime ? dto.endTime.trim() : existing.endTime,
        roomLocation: room ? room.trim() : existing.roomLocation,
        quota: dto.quota !== undefined ? dto.quota : existing.quota,
        notes: dto.notes !== undefined ? dto.notes?.trim() : existing.notes,
        status: dto.status !== undefined ? dto.status : existing.status,
      },
    });

    if (examinerIds !== undefined) {
      await this.assignExaminers(id, {
        examinerUserIds: examinerIds,
      });
    }

    return {
      success: true,
      message: 'Jadwal tes praktik berhasil diperbarui.',
      data: updated,
    };
  }

  async deleteSchedule(id: string) {
    const existing = await this.prisma.practicalSchedule.findUnique({
      where: { id },
      include: { tests: true },
    });
    if (!existing) {
      throw new NotFoundException('Jadwal tes praktik tidak ditemukan.');
    }

    if (existing.tests.length > 0) {
      // Unlink tests first
      await this.prisma.practicalTest.updateMany({
        where: { scheduleId: id },
        data: {
          scheduleId: null,
          status: PracticalTestStatus.NOT_SCHEDULED,
        },
      });
    }

    await this.prisma.practicalSchedule.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Jadwal tes praktik berhasil dihapus.',
    };
  }

  // =========================================================================
  // 3. PENUGASAN PENGUJI & PESERTA (PLOTTING)
  // =========================================================================
  async assignExaminers(scheduleId: string, dto: AssignExaminersDto) {
    const schedule = await this.prisma.practicalSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      throw new NotFoundException('Jadwal tes praktik tidak ditemukan.');
    }

    await this.prisma.practicalScheduleExaminer.deleteMany({
      where: { scheduleId },
    });

    if (dto.examinerUserIds && dto.examinerUserIds.length > 0) {
      const records = dto.examinerUserIds.map((examinerUserId) => ({
        scheduleId,
        examinerUserId,
      }));
      await this.prisma.practicalScheduleExaminer.createMany({
        data: records,
        skipDuplicates: true,
      });
    }

    return {
      success: true,
      message: 'Petugas penguji praktik berhasil ditugaskan ke jadwal.',
    };
  }

  async assignParticipants(
    scheduleId: string,
    dto: AssignPracticalParticipantsDto,
  ) {
    const schedule = await this.prisma.practicalSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        tests: true,
        examiners: { include: { examiner: true } },
      },
    });
    if (!schedule) {
      throw new NotFoundException('Jadwal tes praktik tidak ditemukan.');
    }

    const currentCount = schedule.tests.length;
    const incomingCount = dto.registrationIds.length;
    if (currentCount + incomingCount > schedule.quota) {
      throw new BadRequestException(
        `Kapasitas jadwal tidak mencukupi. Sisa kuota: ${Math.max(
          0,
          schedule.quota - currentCount,
        )} peserta.`,
      );
    }

    const defaultExaminer = schedule.examiners[0]?.examiner;

    for (const regId of dto.registrationIds) {
      await this.prisma.practicalTest.upsert({
        where: { registrationId: regId },
        create: {
          registrationId: regId,
          scheduleId: schedule.id,
          examinerId: defaultExaminer?.id || null,
          examinerName: defaultExaminer?.name || null,
          status: PracticalTestStatus.SCHEDULED,
        },
        update: {
          scheduleId: schedule.id,
          examinerId: defaultExaminer?.id || null,
          examinerName: defaultExaminer?.name || null,
          status: PracticalTestStatus.SCHEDULED,
        },
      });
    }

    return {
      success: true,
      message: `${incomingCount} calon santri berhasil dijadwalkan ke sesi tes praktik.`,
    };
  }

  async removeParticipantFromSchedule(
    scheduleId: string,
    registrationId: string,
  ) {
    await this.prisma.practicalTest.updateMany({
      where: { scheduleId, registrationId },
      data: {
        scheduleId: null,
        status: PracticalTestStatus.NOT_SCHEDULED,
      },
    });

    return {
      success: true,
      message: 'Peserta berhasil dikeluarkan dari jadwal tes praktik.',
    };
  }

  async moveParticipantSchedule(
    registrationId: string,
    dto: MovePracticalParticipantScheduleDto,
  ) {
    const targetSchedule = await this.prisma.practicalSchedule.findUnique({
      where: { id: dto.targetScheduleId },
      include: {
        tests: true,
        examiners: { include: { examiner: true } },
      },
    });
    if (!targetSchedule) {
      throw new NotFoundException('Jadwal tujuan tidak ditemukan.');
    }

    if (targetSchedule.tests.length >= targetSchedule.quota) {
      throw new BadRequestException('Jadwal tujuan sudah penuh.');
    }

    const defaultExaminer = targetSchedule.examiners[0]?.examiner;

    await this.prisma.practicalTest.upsert({
      where: { registrationId },
      create: {
        registrationId,
        scheduleId: targetSchedule.id,
        examinerId: defaultExaminer?.id || null,
        examinerName: defaultExaminer?.name || null,
        status: PracticalTestStatus.SCHEDULED,
      },
      update: {
        scheduleId: targetSchedule.id,
        examinerId: defaultExaminer?.id || null,
        examinerName: defaultExaminer?.name || null,
        status: PracticalTestStatus.SCHEDULED,
      },
    });

    return {
      success: true,
      message: 'Jadwal tes praktik peserta berhasil dipindahkan.',
    };
  }

  // =========================================================================
  // 4. CANDIDATES READY FOR PRACTICAL TEST
  // =========================================================================
  async listReadyCandidates(query: PracticalCandidateFilterDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (!query.search?.trim()) {
      where.formStatus = 'VERIFIED';
    }

    if (query.schoolId) {
      where.classProgram = {
        major: { schoolId: query.schoolId },
      };
    }
    if (query.academicPeriodId) where.academicPeriodId = query.academicPeriodId;
    if (query.admissionWaveId) where.admissionWaveId = query.admissionWaveId;

    if (query.status === 'NOT_SCHEDULED') {
      where.OR = [
        { practicalTest: null },
        { practicalTest: { status: PracticalTestStatus.NOT_SCHEDULED } },
      ];
    } else if (query.status === 'SCHEDULED') {
      where.practicalTest = { status: PracticalTestStatus.SCHEDULED };
    } else if (query.status === 'COMPLETED') {
      where.practicalTest = { status: PracticalTestStatus.COMPLETED };
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { registrationNumber: { contains: s, mode: 'insensitive' } },
            { individualParticipant: { fullName: { contains: s, mode: 'insensitive' } } },
            { studentDetail: { fullName: { contains: s, mode: 'insensitive' } } },
            { studentDetail: { nisn: { contains: s, mode: 'insensitive' } } },
            { user: { name: { contains: s, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.registration.count({ where }),
      this.prisma.registration.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          user: {
            select: { id: true, name: true, email: true, phoneNumber: true },
          },
          individualParticipant: true,
          studentDetail: true,
          classProgram: {
            include: { major: { include: { school: true } } },
          },
          admissionWave: true,
          cbtAttempt: true,
          practicalTest: {
            include: {
              schedule: true,
              examiner: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
    ]);

    const formatted = items.map((reg) => {
      const p = reg.practicalTest;
      const isCbtDone = Boolean(
        reg.cbtAttempt &&
          (reg.cbtAttempt.status === CBTAttemptStatus.COMPLETED ||
            reg.cbtAttempt.gradingStatus === CBTGradingStatus.GRADED),
      );
      const isCbtVerified = reg.cbtAttempt?.verificationStatus === 'VERIFIED';

      return {
        id: reg.id,
        registrationNumber: reg.registrationNumber,
        studentName:
          reg.studentDetail?.fullName ||
          reg.individualParticipant?.fullName ||
          reg.user?.name ||
          'Calon Santri',
        gender:
          reg.studentDetail?.gender ||
          reg.individualParticipant?.gender ||
          '-',
        nisn: reg.studentDetail?.nisn || '-',
        schoolName: reg.classProgram?.major?.school?.name || '-',
        className: reg.classProgram?.name || '-',
        waveName: reg.admissionWave?.name || '-',
        cbtStatus: isCbtVerified ? 'VERIFIED' : isCbtDone ? 'COMPLETED' : 'PENDING',
        cbtScore: reg.cbtAttempt?.totalScore
          ? Number(reg.cbtAttempt.totalScore)
          : null,
        practicalStatus: p?.status || PracticalTestStatus.NOT_SCHEDULED,
        schedule: p?.schedule
          ? {
              id: p.schedule.id,
              name: p.schedule.name,
              scheduleDate: p.schedule.scheduleDate,
              startTime: p.schedule.startTime,
              endTime: p.schedule.endTime,
              roomLocation: p.schedule.roomLocation,
            }
          : null,
        examinerName: p?.examinerName || p?.examiner?.name || '-',
        btqScore: p?.btqScore || null,
        wudhuScore: p?.wudhuScore || null,
        salatScore: p?.salatScore || null,
        totalScore: p?.totalScore ? Number(p.totalScore) : null,
      };
    });

    return {
      success: true,
      data: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // =========================================================================
  // 5. EXAMINER (PETUGAS TES PRAKTIK) ENDPOINTS
  // =========================================================================
  async listExaminers() {
    const users = await this.prisma.user.findMany({
      where: {
        role: Role.PETUGAS_TES_PRAKTIK,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
      },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: users };
  }

  async getMySchedules(examinerUserId: string) {
    const schedules = await this.prisma.practicalSchedule.findMany({
      where: {
        examiners: {
          some: { examinerUserId },
        },
      },
      orderBy: [{ scheduleDate: 'desc' }, { startTime: 'asc' }],
      include: {
        school: true,
        major: true,
        classProgram: true,
        admissionWave: true,
        tests: {
          select: {
            id: true,
            status: true,
            totalScore: true,
          },
        },
      },
    });

    const data = schedules.map((s) => {
      const assignedCount = s.tests.length;
      const completedCount = s.tests.filter(
        (t) => t.status === PracticalTestStatus.COMPLETED,
      ).length;
      return {
        id: s.id,
        name: s.name || `Jadwal Praktik ${s.roomLocation}`,
        scheduleDate: s.scheduleDate,
        startTime: s.startTime,
        endTime: s.endTime,
        roomLocation: s.roomLocation,
        quota: s.quota,
        status: s.status,
        waveName: s.admissionWave?.name || '-',
        schoolName: s.school?.name || 'Semua Unit',
        className: s.classProgram?.name || 'Semua Kelas',
        assignedCount,
        completedCount,
        pendingCount: assignedCount - completedCount,
      };
    });

    return { success: true, data };
  }

  async getMyScheduleParticipants(
    scheduleId: string,
    examinerUserId?: string,
  ) {
    const s = await this.prisma.practicalSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        examiners: true,
        tests: {
          include: {
            registration: {
              include: {
                studentDetail: true,
                individualParticipant: true,
                classProgram: {
                  include: { major: { include: { school: true } } },
                },
                cbtAttempt: true,
              },
            },
          },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });

    if (!s) {
      throw new NotFoundException('Jadwal tes praktik tidak ditemukan.');
    }

    const participants = s.tests.map((t) => {
      const reg = t.registration;
      return {
        testId: t.id,
        registrationId: reg.id,
        registrationNumber: reg.registrationNumber,
        studentName:
          reg.studentDetail?.fullName ||
          reg.individualParticipant?.fullName ||
          'Calon Santri',
        gender:
          reg.studentDetail?.gender ||
          reg.individualParticipant?.gender ||
          '-',
        nisn: reg.studentDetail?.nisn || '-',
        schoolName: reg.classProgram?.major?.school?.name || '-',
        className: reg.classProgram?.name || '-',
        cbtScore: reg.cbtAttempt?.totalScore
          ? Number(reg.cbtAttempt.totalScore)
          : null,
        practicalStatus: t.status,
        btqScore: t.btqScore,
        wudhuScore: t.wudhuScore,
        salatScore: t.salatScore,
        totalScore: t.totalScore ? Number(t.totalScore) : null,
        testedAt: t.testedAt,
      };
    });

    return {
      success: true,
      data: {
        schedule: {
          id: s.id,
          name: s.name,
          scheduleDate: s.scheduleDate,
          startTime: s.startTime,
          endTime: s.endTime,
          roomLocation: s.roomLocation,
          quota: s.quota,
          status: s.status,
        },
        participants,
      },
    };
  }

  async getCandidateDetail(registrationId: string) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        individualParticipant: true,
        studentDetail: true,
        classProgram: {
          include: { major: { include: { school: true } } },
        },
        admissionWave: true,
        cbtAttempt: true,
        practicalTest: {
          include: {
            schedule: true,
            examiner: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!reg) {
      throw new NotFoundException('Data pendaftaran calon santri tidak ditemukan.');
    }

    const studentName =
      reg.studentDetail?.fullName ||
      reg.individualParticipant?.fullName ||
      'Calon Santri';

    const p = reg.practicalTest;

    return {
      success: true,
      data: {
        id: reg.id,
        registrationNumber: reg.registrationNumber,
        studentName,
        gender:
          reg.studentDetail?.gender ||
          reg.individualParticipant?.gender ||
          '-',
        birthPlace: reg.studentDetail?.birthPlace || '-',
        birthDate: reg.studentDetail?.birthDate || null,
        nisn: reg.studentDetail?.nisn || '-',
        nik: reg.studentDetail?.nik || '-',
        previousSchool: reg.studentDetail?.previousSchoolName || '-',
        schoolName: reg.classProgram?.major?.school?.name || '-',
        className: reg.classProgram?.name || '-',
        waveName: reg.admissionWave?.name || '-',
        cbt: reg.cbtAttempt
          ? {
              status: reg.cbtAttempt.status,
              verificationStatus: reg.cbtAttempt.verificationStatus,
              totalScore: reg.cbtAttempt.totalScore
                ? Number(reg.cbtAttempt.totalScore)
                : 0,
            }
          : null,
        practicalTest: p
          ? {
              id: p.id,
              schedule: p.schedule
                ? {
                    id: p.schedule.id,
                    name: p.schedule.name,
                    scheduleDate: p.schedule.scheduleDate,
                    startTime: p.schedule.startTime,
                    endTime: p.schedule.endTime,
                    roomLocation: p.schedule.roomLocation,
                  }
                : null,
              status: p.status,
              btqScore: p.btqScore,
              btqNotes: p.btqNotes,
              wudhuScore: p.wudhuScore,
              wudhuNotes: p.wudhuNotes,
              salatScore: p.salatScore,
              salatNotes: p.salatNotes,
              totalScore: p.totalScore ? Number(p.totalScore) : null,
              generalNotes: p.generalNotes,
              examinerName: p.examinerName || p.examiner?.name || '-',
              testedAt: p.testedAt,
            }
          : null,
        scoreLabels: PracticalTestService.SCORE_LABELS,
      },
    };
  }

  async submitPracticalScore(
    registrationId: string,
    dto: SubmitPracticalScoreDto,
    examinerUser: { id: string; name: string },
  ) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        studentDetail: true,
        individualParticipant: true,
      },
    });

    if (!reg) {
      throw new NotFoundException('Data calon santri tidak ditemukan.');
    }

    const calculatedAvg = Number(
      ((dto.btqScore + dto.wudhuScore + dto.salatScore) / 3).toFixed(2),
    );
    const testStatus = dto.status || PracticalTestStatus.COMPLETED;

    const saved = await this.prisma.practicalTest.upsert({
      where: { registrationId },
      create: {
        registrationId,
        examinerId: examinerUser.id,
        examinerName: examinerUser.name,
        btqScore: dto.btqScore,
        btqNotes: dto.btqNotes?.trim() || null,
        wudhuScore: dto.wudhuScore,
        wudhuNotes: dto.wudhuNotes?.trim() || null,
        salatScore: dto.salatScore,
        salatNotes: dto.salatNotes?.trim() || null,
        totalScore: calculatedAvg,
        generalNotes: dto.generalNotes?.trim() || null,
        status: testStatus,
        completedAt: new Date(),
        testedAt: new Date(),
      },
      update: {
        examinerId: examinerUser.id,
        examinerName: examinerUser.name,
        btqScore: dto.btqScore,
        btqNotes: dto.btqNotes?.trim() || null,
        wudhuScore: dto.wudhuScore,
        wudhuNotes: dto.wudhuNotes?.trim() || null,
        salatScore: dto.salatScore,
        salatNotes: dto.salatNotes?.trim() || null,
        totalScore: calculatedAvg,
        generalNotes: dto.generalNotes?.trim() || null,
        status: testStatus,
        completedAt: new Date(),
        testedAt: new Date(),
      },
    });

    // Audit log
    await this.auditService.log({
      userId: examinerUser.id,
      action: 'SUBMIT_PRACTICAL_TEST_SCORE',
      targetTable: 'practical_tests',
      targetId: saved.id,
      details: JSON.stringify({
        registrationNumber: reg.registrationNumber,
        studentName:
          reg.studentDetail?.fullName ||
          reg.individualParticipant?.fullName,
        btqScore: dto.btqScore,
        wudhuScore: dto.wudhuScore,
        salatScore: dto.salatScore,
        totalScore: calculatedAvg,
      }),
    });

    return {
      success: true,
      message: 'Nilai tes praktik (BTQ, Wudhu & Salat) berhasil disimpan!',
      data: saved,
    };
  }

  async getRecapReport() {
    const list = await this.prisma.practicalTest.findMany({
      include: {
        schedule: true,
        registration: {
          include: {
            individualParticipant: true,
            studentDetail: true,
            classProgram: {
              include: {
                major: {
                  include: { school: true },
                },
              },
            },
            admissionWave: true,
          },
        },
      },
      orderBy: [{ testedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const formatted = list.map((item) => {
      const reg = item.registration;
      return {
        id: item.id,
        registrationNumber: reg.registrationNumber,
        studentName:
          reg.studentDetail?.fullName ||
          reg.individualParticipant?.fullName ||
          '-',
        gender:
          reg.studentDetail?.gender ||
          reg.individualParticipant?.gender ||
          '-',
        schoolName: reg.classProgram?.major?.school?.name || '-',
        className: reg.classProgram?.name || '-',
        waveName: reg.admissionWave?.name || '-',
        scheduleName: item.schedule?.name || '-',
        roomLocation: item.schedule?.roomLocation || '-',
        btqScore: item.btqScore,
        btqScoreLabel: item.btqScore
          ? PracticalTestService.SCORE_LABELS[item.btqScore]
          : '-',
        btqNotes: item.btqNotes || '-',
        wudhuScore: item.wudhuScore,
        wudhuScoreLabel: item.wudhuScore
          ? PracticalTestService.SCORE_LABELS[item.wudhuScore]
          : '-',
        wudhuNotes: item.wudhuNotes || '-',
        salatScore: item.salatScore,
        salatScoreLabel: item.salatScore
          ? PracticalTestService.SCORE_LABELS[item.salatScore]
          : '-',
        salatNotes: item.salatNotes || '-',
        totalScore: item.totalScore ? Number(item.totalScore) : null,
        generalNotes: item.generalNotes || '-',
        examinerName: item.examinerName || '-',
        status: item.status,
        testedAt: item.testedAt,
      };
    });

    return {
      success: true,
      data: formatted,
    };
  }

  async adminVerifyPracticalTest(
    registrationId: string,
    body: {
      status?: PracticalTestStatus;
      generalNotes?: string;
      btqScore?: number;
      btqNotes?: string;
      wudhuScore?: number;
      wudhuNotes?: string;
      salatScore?: number;
      salatNotes?: string;
    },
    user: any,
  ) {
    const reg = await this.prisma.registration.findFirst({
      where: {
        OR: [{ id: registrationId }, { registrationNumber: registrationId }],
      },
      include: { practicalTest: true },
    });
    if (!reg) throw new NotFoundException('Calon santri tidak ditemukan.');

    const currentTest = reg.practicalTest;
    const btq = body.btqScore !== undefined ? body.btqScore : (currentTest?.btqScore ?? 3);
    const wudhu = body.wudhuScore !== undefined ? body.wudhuScore : (currentTest?.wudhuScore ?? 3);
    const salat = body.salatScore !== undefined ? body.salatScore : (currentTest?.salatScore ?? 3);
    const totalScore = Number(((btq + wudhu + salat) / 3).toFixed(2));
    const testStatus = body.status || PracticalTestStatus.COMPLETED;

    const updated = await this.prisma.practicalTest.upsert({
      where: { registrationId: reg.id },
      create: {
        registrationId: reg.id,
        examinerId: user?.id || null,
        examinerName: user?.name || 'Administrator',
        btqScore: btq,
        btqNotes: body.btqNotes || currentTest?.btqNotes || null,
        wudhuScore: wudhu,
        wudhuNotes: body.wudhuNotes || currentTest?.wudhuNotes || null,
        salatScore: salat,
        salatNotes: body.salatNotes || currentTest?.salatNotes || null,
        totalScore,
        generalNotes: body.generalNotes || 'Diverifikasi Lulus Tes Praktik oleh Admin',
        status: testStatus,
        completedAt: new Date(),
        testedAt: new Date(),
      },
      update: {
        status: testStatus,
        ...(body.generalNotes && { generalNotes: body.generalNotes }),
        ...(body.btqScore !== undefined && { btqScore: body.btqScore }),
        ...(body.btqNotes !== undefined && { btqNotes: body.btqNotes }),
        ...(body.wudhuScore !== undefined && { wudhuScore: body.wudhuScore }),
        ...(body.wudhuNotes !== undefined && { wudhuNotes: body.wudhuNotes }),
        ...(body.salatScore !== undefined && { salatScore: body.salatScore }),
        ...(body.salatNotes !== undefined && { salatNotes: body.salatNotes }),
        totalScore,
        completedAt: new Date(),
      },
    });

    if (this.auditService) {
      await this.auditService.log({
        userId: user?.id,
        action: 'VERIFY_PRACTICAL_TEST',
        targetTable: 'practical_tests',
        targetId: updated.id,
        details: JSON.stringify({
          registrationId: reg.id,
          registrationNumber: reg.registrationNumber,
          status: updated.status,
          totalScore: updated.totalScore,
          verifiedBy: user?.name || 'Admin',
        }),
      });
    }

    return {
      success: true,
      message: 'Status verifikasi tes praktik berhasil diperbarui.',
      data: updated,
    };
  }
}
