import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnswerNoteMode,
  Gender,
  InterviewPackageStatus,
  InterviewRecommendation,
  InterviewScheduleStatus,
  InterviewStatus,
  Prisma,
  Role,
} from '@prisma/client';
import {
  AdminUpdateInterviewDto,
  AspectConfigItemDto,
  AssignInterviewersDto,
  AssignParticipantsDto,
  CheckInParticipantDto,
  CreateInterviewAspectDto,
  CreateInterviewCategoryDto,
  CreateInterviewPackageDto,
  CreateInterviewQuestionDto,
  CreateInterviewScheduleDto,
  DuplicatePackageDto,
  MoveParticipantScheduleDto,
  SaveAspectConfigsDto,
  SaveInterviewAssessmentDto,
  UpdateInterviewAspectDto,
  UpdateInterviewCategoryDto,
  UpdateInterviewPackageDto,
  UpdateInterviewQuestionDto,
  UpdateInterviewScheduleDto,
  UpdatePackageQuestionsOrderDto,
} from './dto/interview.dto';

@Injectable()
export class InterviewService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // 1. MASTER KATEGORI PERTANYAAN
  // ==========================================================================

  async listCategories(search?: string, isActive?: boolean) {
    const where: Prisma.InterviewQuestionCategoryWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.interviewQuestionCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  async createCategory(dto: CreateInterviewCategoryDto) {
    return this.prisma.interviewQuestionCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateInterviewCategoryDto) {
    const existing = await this.prisma.interviewQuestionCategory.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Kategori tidak ditemukan.');

    return this.prisma.interviewQuestionCategory.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description:
          dto.description !== undefined ? dto.description : existing.description,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        isActive: dto.isActive ?? existing.isActive,
      },
    });
  }

  async deleteCategory(id: string) {
    const existing = await this.prisma.interviewQuestionCategory.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    });
    if (!existing) throw new NotFoundException('Kategori tidak ditemukan.');
    if (existing._count.questions > 0) {
      throw new BadRequestException(
        'Kategori tidak dapat dihapus karena masih memiliki pertanyaan di Bank Soal.',
      );
    }

    return this.prisma.interviewQuestionCategory.delete({ where: { id } });
  }

  // ==========================================================================
  // 2. BANK PERTANYAAN WAWANCARA
  // ==========================================================================

  async listQuestions(
    search?: string,
    categoryId?: string,
    academicPeriodId?: string,
    schoolId?: string,
    majorId?: string,
    classProgramId?: string,
    isActive?: boolean,
    page = 1,
    perPage = 25,
  ) {
    const where: Prisma.InterviewQuestionWhereInput = {};
    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { interviewerGuidance: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (academicPeriodId) where.academicPeriodId = academicPeriodId;
    if (schoolId) where.schoolId = schoolId;
    if (majorId) where.majorId = majorId;
    if (classProgramId) where.classProgramId = classProgramId;
    if (isActive !== undefined) where.isActive = isActive;

    const skip = (page - 1) * perPage;
    const [total, data] = await Promise.all([
      this.prisma.interviewQuestion.count({ where }),
      this.prisma.interviewQuestion.findMany({
        where,
        skip,
        take: perPage,
        orderBy: [{ category: { sortOrder: 'asc' } }, { createdAt: 'desc' }],
        include: {
          category: true,
          academicPeriod: true,
          school: true,
          major: true,
          classProgram: true,
          _count: {
            select: { packageQuestions: true },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async createQuestion(dto: CreateInterviewQuestionDto) {
    return this.prisma.interviewQuestion.create({
      data: {
        categoryId: dto.categoryId,
        question: dto.question,
        interviewerGuidance: dto.interviewerGuidance,
        academicPeriodId: dto.academicPeriodId || null,
        schoolId: dto.schoolId || null,
        majorId: dto.majorId || null,
        classProgramId: dto.classProgramId || null,
        isActive: dto.isActive ?? true,
      },
      include: {
        category: true,
        academicPeriod: true,
        school: true,
        classProgram: true,
      },
    });
  }

  async updateQuestion(id: string, dto: UpdateInterviewQuestionDto) {
    const existing = await this.prisma.interviewQuestion.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Pertanyaan tidak ditemukan.');

    return this.prisma.interviewQuestion.update({
      where: { id },
      data: {
        categoryId: dto.categoryId ?? existing.categoryId,
        question: dto.question ?? existing.question,
        interviewerGuidance:
          dto.interviewerGuidance !== undefined
            ? dto.interviewerGuidance
            : existing.interviewerGuidance,
        academicPeriodId:
          dto.academicPeriodId !== undefined
            ? dto.academicPeriodId || null
            : existing.academicPeriodId,
        schoolId:
          dto.schoolId !== undefined
            ? dto.schoolId || null
            : existing.schoolId,
        majorId:
          dto.majorId !== undefined ? dto.majorId || null : existing.majorId,
        classProgramId:
          dto.classProgramId !== undefined
            ? dto.classProgramId || null
            : existing.classProgramId,
        isActive: dto.isActive ?? existing.isActive,
      },
      include: {
        category: true,
        academicPeriod: true,
        school: true,
        classProgram: true,
      },
    });
  }

  async deleteQuestion(id: string) {
    const existing = await this.prisma.interviewQuestion.findUnique({
      where: { id },
      include: { _count: { select: { packageQuestions: true } } },
    });
    if (!existing) throw new NotFoundException('Pertanyaan tidak ditemukan.');
    if (existing._count.packageQuestions > 0) {
      throw new BadRequestException(
        'Pertanyaan tidak dapat dihapus karena sudah terhubung ke Paket Wawancara. Nonaktifkan saja jika tidak ingin digunakan.',
      );
    }

    return this.prisma.interviewQuestion.delete({ where: { id } });
  }

  async duplicateQuestion(id: string) {
    const original = await this.prisma.interviewQuestion.findUnique({
      where: { id },
    });
    if (!original) throw new NotFoundException('Pertanyaan tidak ditemukan.');

    return this.prisma.interviewQuestion.create({
      data: {
        categoryId: original.categoryId,
        question: `${original.question} (Salinan)`,
        interviewerGuidance: original.interviewerGuidance,
        academicPeriodId: original.academicPeriodId,
        schoolId: original.schoolId,
        majorId: original.majorId,
        classProgramId: original.classProgramId,
        isActive: true,
      },
      include: { category: true },
    });
  }

  // ==========================================================================
  // 3. PAKET WAWANCARA
  // ==========================================================================

  async listPackages(
    search?: string,
    academicPeriodId?: string,
    schoolId?: string,
    majorId?: string,
    classProgramId?: string,
    status?: InterviewPackageStatus,
    page = 1,
    perPage = 25,
  ) {
    const where: Prisma.InterviewPackageWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (academicPeriodId) where.academicPeriodId = academicPeriodId;
    if (schoolId) where.schoolId = schoolId;
    if (majorId) where.majorId = majorId;
    if (classProgramId) where.classProgramId = classProgramId;
    if (status) where.status = status;

    const skip = (page - 1) * perPage;
    const [total, data] = await Promise.all([
      this.prisma.interviewPackage.count({ where }),
      this.prisma.interviewPackage.findMany({
        where,
        skip,
        take: perPage,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          academicPeriod: true,
          school: true,
          major: true,
          classProgram: true,
          _count: {
            select: {
              packageQuestions: true,
              schedules: true,
              interviews: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getPackageById(id: string) {
    const pkg = await this.prisma.interviewPackage.findUnique({
      where: { id },
      include: {
        academicPeriod: true,
        school: true,
        major: true,
        classProgram: true,
        packageQuestions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            question: {
              include: { category: true },
            },
          },
        },
        _count: {
          select: {
            schedules: true,
            interviews: true,
          },
        },
      },
    });
    if (!pkg) throw new NotFoundException('Paket Wawancara tidak ditemukan.');
    return pkg;
  }

  async createPackage(userId: string, dto: CreateInterviewPackageDto) {
    const existingCode = await this.prisma.interviewPackage.findUnique({
      where: { code: dto.code },
    });
    if (existingCode) {
      throw new BadRequestException(`Kode paket "${dto.code}" sudah digunakan.`);
    }

    return this.prisma.interviewPackage.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        academicPeriodId: dto.academicPeriodId || null,
        schoolId: dto.schoolId || null,
        majorId: dto.majorId || null,
        classProgramId: dto.classProgramId || null,
        status: dto.status ?? InterviewPackageStatus.DRAFT,
        createdByUserId: userId,
      },
    });
  }

  async updatePackage(id: string, dto: UpdateInterviewPackageDto) {
    const existing = await this.prisma.interviewPackage.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Paket Wawancara tidak ditemukan.');

    if (dto.code && dto.code !== existing.code) {
      const codeCheck = await this.prisma.interviewPackage.findUnique({
        where: { code: dto.code },
      });
      if (codeCheck) {
        throw new BadRequestException(`Kode paket "${dto.code}" sudah digunakan.`);
      }
    }

    return this.prisma.interviewPackage.update({
      where: { id },
      data: {
        code: dto.code ?? existing.code,
        name: dto.name ?? existing.name,
        description:
          dto.description !== undefined ? dto.description : existing.description,
        academicPeriodId:
          dto.academicPeriodId !== undefined
            ? dto.academicPeriodId || null
            : existing.academicPeriodId,
        schoolId:
          dto.schoolId !== undefined
            ? dto.schoolId || null
            : existing.schoolId,
        majorId:
          dto.majorId !== undefined ? dto.majorId || null : existing.majorId,
        classProgramId:
          dto.classProgramId !== undefined
            ? dto.classProgramId || null
            : existing.classProgramId,
        status: dto.status ?? existing.status,
      },
    });
  }

  async deletePackage(id: string) {
    const pkg = await this.prisma.interviewPackage.findUnique({
      where: { id },
      include: {
        _count: {
          select: { interviews: true, schedules: true },
        },
      },
    });
    if (!pkg) throw new NotFoundException('Paket Wawancara tidak ditemukan.');

    if (pkg._count.interviews > 0 || pkg._count.schedules > 0) {
      // Soft-archive instead of hard deleting to preserve historical integrity
      return this.prisma.interviewPackage.update({
        where: { id },
        data: { status: InterviewPackageStatus.ARCHIVED },
      });
    }

    return this.prisma.interviewPackage.delete({ where: { id } });
  }

  async addQuestionToPackage(
    packageId: string,
    dto: {
      questionId: string;
      sortOrder?: number;
      isRequired?: boolean;
      answerNoteMode?: AnswerNoteMode;
    },
  ) {
    const pkg = await this.prisma.interviewPackage.findUnique({
      where: { id: packageId },
      include: { packageQuestions: true },
    });
    if (!pkg) throw new NotFoundException('Paket tidak ditemukan.');

    const maxSort =
      pkg.packageQuestions.length > 0
        ? Math.max(...pkg.packageQuestions.map((q) => q.sortOrder))
        : 0;

    return this.prisma.interviewPackageQuestion.upsert({
      where: {
        packageId_questionId: {
          packageId,
          questionId: dto.questionId,
        },
      },
      update: {
        sortOrder: dto.sortOrder ?? maxSort + 1,
        isRequired: dto.isRequired ?? true,
        answerNoteMode: dto.answerNoteMode ?? AnswerNoteMode.OPTIONAL,
      },
      create: {
        packageId,
        questionId: dto.questionId,
        sortOrder: dto.sortOrder ?? maxSort + 1,
        isRequired: dto.isRequired ?? true,
        answerNoteMode: dto.answerNoteMode ?? AnswerNoteMode.OPTIONAL,
      },
      include: {
        question: { include: { category: true } },
      },
    });
  }

  async removeQuestionFromPackage(packageId: string, questionId: string) {
    const existing = await this.prisma.interviewPackageQuestion.findUnique({
      where: {
        packageId_questionId: {
          packageId,
          questionId,
        },
      },
    });
    if (!existing) {
      throw new NotFoundException('Pertanyaan tidak ada dalam paket ini.');
    }

    return this.prisma.interviewPackageQuestion.delete({
      where: {
        packageId_questionId: {
          packageId,
          questionId,
        },
      },
    });
  }

  async updatePackageQuestionsOrder(
    packageId: string,
    dto: UpdatePackageQuestionsOrderDto,
  ) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.interviewPackageQuestion.update({
          where: {
            packageId_questionId: {
              packageId,
              questionId: item.questionId,
            },
          },
          data: {
            sortOrder: item.sortOrder,
            ...(item.isRequired !== undefined && {
              isRequired: item.isRequired,
            }),
            ...(item.answerNoteMode !== undefined && {
              answerNoteMode: item.answerNoteMode,
            }),
          },
        }),
      ),
    );

    return this.getPackageById(packageId);
  }

  async duplicatePackageForNewYear(
    id: string,
    dto: DuplicatePackageDto,
    userId: string,
  ) {
    const original = await this.prisma.interviewPackage.findUnique({
      where: { id },
      include: { packageQuestions: true },
    });
    if (!original) throw new NotFoundException('Paket asal tidak ditemukan.');

    const newPkg = await this.prisma.interviewPackage.create({
      data: {
        code: dto.newCode,
        name: dto.newName,
        description: original.description,
        academicPeriodId: dto.newAcademicPeriodId || original.academicPeriodId,
        schoolId: original.schoolId,
        majorId: original.majorId,
        classProgramId: original.classProgramId,
        status: InterviewPackageStatus.DRAFT,
        createdByUserId: userId,
        packageQuestions: {
          create: original.packageQuestions.map((pq) => ({
            questionId: pq.questionId,
            sortOrder: pq.sortOrder,
            isRequired: pq.isRequired,
            answerNoteMode: pq.answerNoteMode,
          })),
        },
      },
      include: {
        packageQuestions: {
          include: { question: true },
        },
      },
    });

    return newPkg;
  }

  // ==========================================================================
  // 4. ASPEK PENILAIAN
  // ==========================================================================

  async listAspects(search?: string, isActive?: boolean) {
    const where: Prisma.InterviewAspectWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive;

    return this.prisma.interviewAspect.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        configs: {
          include: {
            academicPeriod: true,
            school: true,
            classProgram: true,
          },
        },
      },
    });
  }

  async createAspect(dto: CreateInterviewAspectDto) {
    return this.prisma.interviewAspect.create({
      data: {
        name: dto.name,
        description: dto.description,
        minScore: dto.minScore ?? 1.0,
        maxScore: dto.maxScore ?? 10.0,
        defaultWeight: dto.defaultWeight ?? 20.0,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateAspect(id: string, dto: UpdateInterviewAspectDto) {
    const existing = await this.prisma.interviewAspect.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Aspek penilaian tidak ditemukan.');

    return this.prisma.interviewAspect.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description:
          dto.description !== undefined ? dto.description : existing.description,
        minScore: dto.minScore !== undefined ? dto.minScore : existing.minScore,
        maxScore: dto.maxScore !== undefined ? dto.maxScore : existing.maxScore,
        defaultWeight:
          dto.defaultWeight !== undefined
            ? dto.defaultWeight
            : existing.defaultWeight,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        isActive: dto.isActive ?? existing.isActive,
      },
    });
  }

  async deleteAspect(id: string) {
    const existing = await this.prisma.interviewAspect.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Aspek penilaian tidak ditemukan.');

    return this.prisma.interviewAspect.delete({ where: { id } });
  }

  async getAspectConfigs(
    academicPeriodId?: string,
    schoolId?: string,
    majorId?: string,
    classProgramId?: string,
  ) {
    // Return all base aspects combined with specific overrides
    const baseAspects = await this.prisma.interviewAspect.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const specificConfigs = await this.prisma.interviewAspectConfig.findMany({
      where: {
        isActive: true,
        ...(academicPeriodId && { academicPeriodId }),
        ...(schoolId && { schoolId }),
        ...(majorId && { majorId }),
        ...(classProgramId && { classProgramId }),
      },
    });

    const configMap = new Map(specificConfigs.map((c) => [c.aspectId, c]));

    return baseAspects.map((aspect) => {
      const override = configMap.get(aspect.id);
      return {
        aspectId: aspect.id,
        name: aspect.name,
        description: aspect.description,
        minScore: override ? Number(override.minScore) : Number(aspect.minScore),
        maxScore: override ? Number(override.maxScore) : Number(aspect.maxScore),
        weight: override
          ? Number(override.weight)
          : Number(aspect.defaultWeight),
        sortOrder: override ? override.sortOrder : aspect.sortOrder,
        isCustomized: !!override,
      };
    });
  }

  async saveAspectConfigs(dto: SaveAspectConfigsDto) {
    // Delete existing matching configs first
    await this.prisma.interviewAspectConfig.deleteMany({
      where: {
        academicPeriodId: dto.academicPeriodId || null,
        schoolId: dto.schoolId || null,
        majorId: dto.majorId || null,
        classProgramId: dto.classProgramId || null,
      },
    });

    // Create new records
    await this.prisma.interviewAspectConfig.createMany({
      data: dto.configs.map((c) => ({
        aspectId: c.aspectId,
        academicPeriodId: dto.academicPeriodId || null,
        schoolId: dto.schoolId || null,
        majorId: dto.majorId || null,
        classProgramId: dto.classProgramId || null,
        weight: c.weight,
        minScore: c.minScore ?? 1.0,
        maxScore: c.maxScore ?? 10.0,
        sortOrder: c.sortOrder ?? 0,
        isActive: c.isActive ?? true,
      })),
    });

    return this.getAspectConfigs(
      dto.academicPeriodId,
      dto.schoolId,
      dto.majorId,
      dto.classProgramId,
    );
  }

  // ==========================================================================
  // 5. DATA PEWAWANCARA
  // ==========================================================================

  async listInterviewers(search?: string, isActive?: boolean, page = 1, perPage = 25) {
    const where: Prisma.UserWhereInput = {
      role: Role.PEWAWANCARA,
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive;

    const skip = (page - 1) * perPage;
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          isActive: true,
          createdAt: true,
          interviewerSchedules: {
            include: {
              schedule: true,
            },
          },
          assignedInterviews: {
            select: {
              id: true,
              status: true,
              totalScore: true,
            },
          },
        },
      }),
    ]);

    const formatted = users.map((u) => {
      const assignedCount = u.assignedInterviews.length;
      const completedCount = u.assignedInterviews.filter(
        (i) => i.status === InterviewStatus.COMPLETED,
      ).length;
      const scheduleCount = u.interviewerSchedules.length;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phoneNumber: u.phoneNumber,
        isActive: u.isActive,
        createdAt: u.createdAt,
        scheduleCount,
        assignedCount,
        completedCount,
      };
    });

    return {
      data: formatted,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getInterviewerDetail(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.PEWAWANCARA },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        interviewerSchedules: {
          include: {
            schedule: {
              include: {
                package: true,
                classProgram: true,
                academicPeriod: true,
              },
            },
          },
        },
        assignedInterviews: {
          include: {
            registration: {
              include: {
                studentDetail: true,
                classProgram: true,
                cbtAttempt: true,
              },
            },
            schedule: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) throw new NotFoundException('Pewawancara tidak ditemukan.');
    return user;
  }

  // ==========================================================================
  // 6. JADWAL WAWANCARA
  // ==========================================================================

  async listSchedules(
    search?: string,
    academicPeriodId?: string,
    admissionWaveId?: string,
    schoolId?: string,
    majorId?: string,
    classProgramId?: string,
    status?: InterviewScheduleStatus,
    interviewerId?: string,
    date?: string,
    page = 1,
    perPage = 25,
  ) {
    const where: Prisma.InterviewScheduleWhereInput = {};
    if (search) {
      where.OR = [
        { roomLocation: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { package: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (academicPeriodId) where.academicPeriodId = academicPeriodId;
    if (admissionWaveId) where.admissionWaveId = admissionWaveId;
    if (schoolId) where.schoolId = schoolId;
    if (majorId) where.majorId = majorId;
    if (classProgramId) where.classProgramId = classProgramId;
    if (status) where.status = status;
    if (date) where.scheduleDate = new Date(date);
    if (interviewerId) {
      where.interviewers = {
        some: { interviewerUserId: interviewerId },
      };
    }

    const skip = (page - 1) * perPage;
    const [total, data] = await Promise.all([
      this.prisma.interviewSchedule.count({ where }),
      this.prisma.interviewSchedule.findMany({
        where,
        skip,
        take: perPage,
        orderBy: [{ scheduleDate: 'desc' }, { startTime: 'asc' }],
        include: {
          academicPeriod: true,
          admissionWave: true,
          school: true,
          major: true,
          classProgram: true,
          package: true,
          interviewers: {
            include: {
              interviewer: {
                select: { id: true, name: true, email: true, phoneNumber: true },
              },
            },
          },
          interviews: {
            select: { id: true, status: true, recommendation: true },
          },
          _count: {
            select: { interviews: true },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getScheduleById(id: string) {
    const schedule = await this.prisma.interviewSchedule.findUnique({
      where: { id },
      include: {
        academicPeriod: true,
        admissionWave: true,
        school: true,
        major: true,
        classProgram: true,
        package: {
          include: {
            packageQuestions: {
              include: { question: { include: { category: true } } },
            },
          },
        },
        interviewers: {
          include: {
            interviewer: {
              select: { id: true, name: true, email: true, phoneNumber: true },
            },
          },
        },
        interviews: {
          include: {
            registration: {
              include: {
                studentDetail: true,
                classProgram: true,
                cbtAttempt: true,
                documents: true,
              },
            },
            interviewer: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
    if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan.');
    return schedule;
  }

  async createSchedule(dto: CreateInterviewScheduleDto) {
    const interviewerIds = dto.interviewerUserIds && dto.interviewerUserIds.length > 0
      ? dto.interviewerUserIds
      : (dto.interviewerUserId ? [dto.interviewerUserId] : []);

    const questionsJson = dto.questions && Array.isArray(dto.questions)
      ? JSON.stringify(dto.questions)
      : null;

    const schedule = await this.prisma.interviewSchedule.create({
      data: {
        name: dto.name || null,
        academicPeriodId: dto.academicPeriodId || null,
        admissionWaveId: dto.admissionWaveId || null,
        schoolId: dto.schoolId || null,
        majorId: dto.majorId || null,
        classProgramId: dto.classProgramId || null,
        packageId: dto.packageId || null,
        scheduleDate: new Date(dto.scheduleDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        roomLocation: dto.roomLocation,
        quota: dto.quota ?? 10,
        notes: dto.notes,
        questionsJson,
        status: dto.status ?? InterviewScheduleStatus.ACTIVE,
        ...(interviewerIds.length > 0 && {
          interviewers: {
            create: interviewerIds.map((uId) => ({
              interviewerUserId: uId,
            })),
          },
        }),
      },
      include: {
        interviewers: { include: { interviewer: true } },
        package: true,
      },
    });

    // If registrationIds are provided, assign them to this schedule
    if (dto.registrationIds && dto.registrationIds.length > 0) {
      const primaryInterviewerId = interviewerIds[0] || null;
      for (const regId of dto.registrationIds) {
        await this.prisma.interview.upsert({
          where: { registrationId: regId },
          update: {
            scheduleId: schedule.id,
            interviewerId: primaryInterviewerId,
            status: InterviewStatus.SCHEDULED,
          },
          create: {
            registrationId: regId,
            scheduleId: schedule.id,
            interviewerId: primaryInterviewerId,
            status: InterviewStatus.SCHEDULED,
          },
        });
      }
    }

    return schedule;
  }

  async updateSchedule(id: string, dto: UpdateInterviewScheduleDto) {
    const existing = await this.prisma.interviewSchedule.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Jadwal tidak ditemukan.');

    const interviewerIds = dto.interviewerUserIds && dto.interviewerUserIds.length > 0
      ? dto.interviewerUserIds
      : (dto.interviewerUserId ? [dto.interviewerUserId] : undefined);

    // If interviewers provided, update relation
    if (interviewerIds !== undefined) {
      await this.prisma.interviewScheduleInterviewer.deleteMany({
        where: { scheduleId: id },
      });
      if (interviewerIds.length > 0) {
        await this.prisma.interviewScheduleInterviewer.createMany({
          data: interviewerIds.map((uId) => ({
            scheduleId: id,
            interviewerUserId: uId,
          })),
        });
      }
    }

    const questionsJson = dto.questions !== undefined
      ? (Array.isArray(dto.questions) ? JSON.stringify(dto.questions) : null)
      : existing.questionsJson;

    const updated = await this.prisma.interviewSchedule.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name : existing.name,
        academicPeriodId:
          dto.academicPeriodId !== undefined
            ? dto.academicPeriodId || null
            : existing.academicPeriodId,
        admissionWaveId:
          dto.admissionWaveId !== undefined
            ? dto.admissionWaveId || null
            : existing.admissionWaveId,
        schoolId:
          dto.schoolId !== undefined
            ? dto.schoolId || null
            : existing.schoolId,
        majorId:
          dto.majorId !== undefined ? dto.majorId || null : existing.majorId,
        classProgramId:
          dto.classProgramId !== undefined
            ? dto.classProgramId || null
            : existing.classProgramId,
        packageId:
          dto.packageId !== undefined
            ? dto.packageId || null
            : existing.packageId,
        scheduleDate: dto.scheduleDate
          ? new Date(dto.scheduleDate)
          : existing.scheduleDate,
        startTime: dto.startTime ?? existing.startTime,
        endTime: dto.endTime ?? existing.endTime,
        roomLocation: dto.roomLocation ?? existing.roomLocation,
        quota: dto.quota ?? existing.quota,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        questionsJson,
        status: dto.status ?? existing.status,
      },
      include: {
        interviewers: { include: { interviewer: true } },
        package: true,
      },
    });

    // If registrationIds provided, sync participants
    if (dto.registrationIds !== undefined) {
      const primaryInterviewerId = (interviewerIds && interviewerIds[0]) || null;
      for (const regId of dto.registrationIds) {
        await this.prisma.interview.upsert({
          where: { registrationId: regId },
          update: {
            scheduleId: id,
            interviewerId: primaryInterviewerId,
            status: InterviewStatus.SCHEDULED,
          },
          create: {
            registrationId: regId,
            scheduleId: id,
            interviewerId: primaryInterviewerId,
            status: InterviewStatus.SCHEDULED,
          },
        });
      }
    }

    return updated;
  }

  async deleteSchedule(id: string) {
    const existing = await this.prisma.interviewSchedule.findUnique({
      where: { id },
      include: {
        interviews: {
          include: {
            scores: true,
            questionNotes: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Jadwal tidak ditemukan.');

    return this.prisma.$transaction(async (tx) => {
      // 1. For completed interviews, unlink scheduleId
      await tx.interview.updateMany({
        where: { scheduleId: id, status: InterviewStatus.COMPLETED },
        data: { scheduleId: null },
      });

      // 2. For uncompleted interviews, clean up question notes, scores, and records
      const uncompleted = existing.interviews.filter(
        (i) => i.status !== InterviewStatus.COMPLETED,
      );
      if (uncompleted.length > 0) {
        const uncompletedIds = uncompleted.map((i) => i.id);
        await tx.interviewQuestionNote.deleteMany({
          where: { interviewId: { in: uncompletedIds } },
        });
        await tx.interviewScore.deleteMany({
          where: { interviewId: { in: uncompletedIds } },
        });
        await tx.interview.deleteMany({
          where: { id: { in: uncompletedIds } },
        });
      }

      // 3. Remove assigned interviewers
      await tx.interviewScheduleInterviewer.deleteMany({
        where: { scheduleId: id },
      });

      // 4. Delete the schedule
      return tx.interviewSchedule.delete({ where: { id } });
    });
  }

  async assignInterviewersToSchedule(
    scheduleId: string,
    dto: AssignInterviewersDto,
  ) {
    await this.prisma.interviewScheduleInterviewer.deleteMany({
      where: { scheduleId },
    });
    await this.prisma.interviewScheduleInterviewer.createMany({
      data: dto.interviewerUserIds.map((uId) => ({
        scheduleId,
        interviewerUserId: uId,
      })),
    });

    return this.getScheduleById(scheduleId);
  }

  async assignParticipants(dto: AssignParticipantsDto) {
    let schedule: any = null;
    if (dto.scheduleId) {
      schedule = await this.prisma.interviewSchedule.findUnique({
        where: { id: dto.scheduleId },
      });
      if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan.');
    }

    const packageId = dto.packageId || schedule?.packageId || null;

    const results = [];
    for (const regId of dto.registrationIds) {
      const interview = await this.prisma.interview.upsert({
        where: { registrationId: regId },
        update: {
          scheduleId: dto.scheduleId || undefined,
          interviewerId: dto.interviewerId || undefined,
          packageId: packageId || undefined,
          status: dto.scheduleId
            ? InterviewStatus.SCHEDULED
            : InterviewStatus.NOT_SCHEDULED,
        },
        create: {
          registrationId: regId,
          scheduleId: dto.scheduleId || null,
          interviewerId: dto.interviewerId || null,
          packageId: packageId,
          status: dto.scheduleId
            ? InterviewStatus.SCHEDULED
            : InterviewStatus.NOT_SCHEDULED,
        },
      });
      results.push(interview);
    }

    return { success: true, count: results.length, data: results };
  }

  async moveParticipantSchedule(dto: MoveParticipantScheduleDto) {
    const targetSchedule = await this.prisma.interviewSchedule.findUnique({
      where: { id: dto.targetScheduleId },
    });
    if (!targetSchedule) {
      throw new NotFoundException('Jadwal tujuan tidak ditemukan.');
    }

    const targetPackageId =
      dto.targetPackageId || targetSchedule.packageId || null;

    const updated = await this.prisma.interview.upsert({
      where: { registrationId: dto.registrationId },
      update: {
        scheduleId: dto.targetScheduleId,
        interviewerId: dto.targetInterviewerId || null,
        packageId: targetPackageId,
        status: InterviewStatus.SCHEDULED,
      },
      create: {
        registrationId: dto.registrationId,
        scheduleId: dto.targetScheduleId,
        interviewerId: dto.targetInterviewerId || null,
        packageId: targetPackageId,
        status: InterviewStatus.SCHEDULED,
      },
    });

    return updated;
  }

  // ==========================================================================
  // 7. PESERTA WAWANCARA
  // ==========================================================================

  async listParticipants(
    search?: string,
    gender?: Gender,
    academicPeriodId?: string,
    schoolId?: string,
    majorId?: string,
    classProgramId?: string,
    scheduleId?: string,
    interviewerId?: string,
    status?: InterviewStatus,
    page = 1,
    perPage = 25,
  ) {
    const where: Prisma.RegistrationWhereInput = {};

    if (academicPeriodId) where.academicPeriodId = academicPeriodId;
    if (classProgramId) where.classProgramId = classProgramId;
    if (schoolId) {
      where.classProgram = {
        major: { schoolId },
      };
    }
    if (majorId) {
      where.classProgram = {
        majorId,
      };
    }

    if (gender) {
      where.studentDetail = {
        is: { gender },
      };
    }

    if (search) {
      where.OR = [
        { registrationNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        {
          studentDetail: {
            fullName: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const interviewWhere: Prisma.InterviewWhereInput = {};
    if (status && status !== InterviewStatus.NOT_SCHEDULED && (status as any) !== 'UNASSIGNED') {
      interviewWhere.status = status as InterviewStatus;
    }
    if (scheduleId) {
      interviewWhere.scheduleId = scheduleId;
    }
    if (interviewerId) {
      interviewWhere.interviewerId = interviewerId;
    }

    if (Object.keys(interviewWhere).length > 0) {
      where.interview = { is: interviewWhere };
    } else if (status === InterviewStatus.NOT_SCHEDULED || (status as any) === 'UNASSIGNED') {
      where.OR = [
        { interview: null },
        { interview: { is: { status: InterviewStatus.NOT_SCHEDULED } } },
        { interview: { is: { scheduleId: null } } },
      ];
    }

    const skip = (page - 1) * perPage;
    const [total, regs] = await Promise.all([
      this.prisma.registration.count({ where }),
      this.prisma.registration.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phoneNumber: true } },
          studentDetail: true,
          classProgram: {
            include: {
              major: { include: { school: true } },
            },
          },
          academicPeriod: true,
          admissionWave: true,
          cbtAttempt: {
            select: {
              id: true,
              totalScore: true,
              verificationStatus: true,
              status: true,
            },
          },
          interview: {
            include: {
              schedule: true,
              interviewer: {
                select: { id: true, name: true, email: true, phoneNumber: true },
              },
              package: true,
            },
          },
        },
      }),
    ]);

    const formatted = regs.map((r) => {
      const interviewStatus = r.interview?.status || InterviewStatus.NOT_SCHEDULED;
      const resolvedGender = r.studentDetail?.gender || 'L';
      const genderLabel = resolvedGender === 'P' ? 'Perempuan (Akhwat)' : 'Laki-laki (Ikhwan)';

      return {
        id: r.id,
        registrationNumber: r.registrationNumber,
        participantName:
          r.studentDetail?.fullName || r.user.name || 'Calon Santri',
        gender: resolvedGender,
        genderLabel,
        photoPath: null, // can be extracted from documents if needed
        schoolName: r.classProgram.major.school.name,
        majorName: r.classProgram.major.name,
        programName: r.classProgram.name,
        originSchool: r.studentDetail?.previousSchoolName || '-',
        cbtScore: r.cbtAttempt?.totalScore
          ? Number(r.cbtAttempt.totalScore)
          : null,
        cbtVerificationStatus: r.cbtAttempt?.verificationStatus || null,
        fileVerificationStatus: r.formStatus,
        scheduleId: r.interview?.scheduleId || null,
        scheduleDate: r.interview?.schedule?.scheduleDate || null,
        scheduleTime: r.interview?.schedule
          ? `${r.interview.schedule.startTime} - ${r.interview.schedule.endTime}`
          : null,
        roomLocation: r.interview?.schedule?.roomLocation || null,
        interviewerId: r.interview?.interviewerId || null,
        interviewerName: r.interview?.interviewer?.name || null,
        interviewPackageId: r.interview?.packageId || null,
        interviewPackageName: r.interview?.package?.name || null,
        interviewStatus,
        totalScore: r.interview?.totalScore
          ? Number(r.interview.totalScore)
          : null,
        recommendation: r.interview?.recommendation || null,
        checkedInAt: r.interview?.checkedInAt || null,
        interviewId: r.interview?.id || null,
      };
    });

    return {
      data: formatted,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  // ==========================================================================
  // 8. CHECK-IN WAWANCARA
  // ==========================================================================

  async checkInParticipant(
    identifier: string,
    status: InterviewStatus = InterviewStatus.CHECKED_IN,
    staffUserId?: string,
  ) {
    const reg = await this.prisma.registration.findFirst({
      where: {
        OR: [
          { qrCodeToken: identifier },
          { registrationNumber: identifier },
          { id: identifier },
        ],
      },
      include: {
        user: true,
        studentDetail: true,
        classProgram: true,
        interview: {
          include: { schedule: true, interviewer: true },
        },
      },
    });

    if (!reg) {
      throw new NotFoundException(
        'Peserta tidak ditemukan dengan barcode / nomor pendaftaran ini.',
      );
    }

    const updatedInterview = await this.prisma.interview.upsert({
      where: { registrationId: reg.id },
      update: {
        status,
        checkedInAt: new Date(),
        checkedInByUserId: staffUserId || null,
      },
      create: {
        registrationId: reg.id,
        status,
        checkedInAt: new Date(),
        checkedInByUserId: staffUserId || null,
      },
      include: {
        schedule: true,
        interviewer: true,
      },
    });

    return {
      success: true,
      message: `Peserta ${reg.studentDetail?.fullName || reg.user.name} berhasil di-check-in (${status}).`,
      data: {
        registrationNumber: reg.registrationNumber,
        fullName: reg.studentDetail?.fullName || reg.user.name,
        programName: reg.classProgram.name,
        interviewStatus: updatedInterview.status,
        scheduleDate: updatedInterview.schedule?.scheduleDate || null,
        roomLocation: updatedInterview.schedule?.roomLocation || null,
        interviewerName: updatedInterview.interviewer?.name || null,
      },
    };
  }

  // ==========================================================================
  // 9. PROSES WAWANCARA & PENILAIAN
  // ==========================================================================

  async getInterviewDetailForProcess(
    identifier: string, // interviewId, registrationId, or registrationNumber
    currentUser: { id: string; role: Role },
  ) {
    let interview = await this.prisma.interview.findFirst({
      where: {
        OR: [
          { id: identifier },
          { registrationId: identifier },
          { registration: { registrationNumber: identifier } },
        ],
      },
      include: {
        registration: {
          include: {
            user: true,
            studentDetail: true,
            classProgram: {
              include: {
                major: { include: { school: true } },
              },
            },
            documents: true,
            cbtAttempt: true,
          },
        },
        schedule: {
          include: {
            interviewers: { include: { interviewer: true } },
            package: true,
          },
        },
        interviewer: true,
        package: {
          include: {
            packageQuestions: {
              orderBy: { sortOrder: 'asc' },
              include: {
                question: { include: { category: true } },
              },
            },
          },
        },
        scores: true,
        questionNotes: true,
      },
    });

    if (!interview) {
      // Check if registration exists and create placeholder interview record
      const reg = await this.prisma.registration.findFirst({
        where: {
          OR: [{ id: identifier }, { registrationNumber: identifier }],
        },
        include: {
          user: true,
          studentDetail: true,
          classProgram: {
            include: {
              major: { include: { school: true } },
            },
          },
          documents: true,
          cbtAttempt: true,
        },
      });

      if (!reg) throw new NotFoundException('Data wawancara tidak ditemukan.');

      interview = await this.prisma.interview.create({
        data: {
          registrationId: reg.id,
          status: InterviewStatus.NOT_SCHEDULED,
        },
        include: {
          registration: {
            include: {
              user: true,
              studentDetail: true,
              classProgram: {
                include: {
                  major: { include: { school: true } },
                },
              },
              documents: true,
              cbtAttempt: true,
            },
          },
          schedule: {
            include: {
              interviewers: { include: { interviewer: true } },
              package: true,
            },
          },
          interviewer: true,
          package: {
            include: {
              packageQuestions: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  question: { include: { category: true } },
                },
              },
            },
          },
          scores: true,
          questionNotes: true,
        },
      });
    }

    // Role-based Access Check
    if (currentUser.role === Role.PEWAWANCARA) {
      const isAssignedDirectly = interview.interviewerId === currentUser.id;
      const isAssignedViaSchedule = interview.schedule?.interviewers?.some(
        (si) => si.interviewerUserId === currentUser.id,
      );

      if (!isAssignedDirectly && !isAssignedViaSchedule) {
        throw new ForbiddenException(
          'Anda tidak memiliki hak akses untuk data wawancara peserta ini.',
        );
      }
    }

    // Determine Questions Snapshot from Schedule or Snapshot
    let questionsSnapshot: any[] = [];
    if (interview.snapshotQuestionsJson) {
      try {
        questionsSnapshot = JSON.parse(interview.snapshotQuestionsJson);
      } catch (e) {
        questionsSnapshot = [];
      }
    }

    if (questionsSnapshot.length === 0 && interview.schedule?.questionsJson) {
      try {
        const parsed = JSON.parse(interview.schedule.questionsJson);
        if (Array.isArray(parsed)) {
          questionsSnapshot = parsed.map((q, idx) => ({
            questionId: `q-${idx + 1}`,
            questionText: typeof q === 'string' ? q : (q.questionText || q.question || ''),
            sortOrder: idx + 1,
            isCustomQuestion: false,
          }));
        }
      } catch (e) {
        questionsSnapshot = [];
      }
    }

    if (questionsSnapshot.length === 0) {
      // Fallback: check if package has questions
      let activePackage: any = interview.package;
      if (!activePackage && interview.schedule?.packageId) {
        activePackage = await this.prisma.interviewPackage.findUnique({
          where: { id: interview.schedule.packageId },
          include: {
            packageQuestions: {
              orderBy: { sortOrder: 'asc' },
              include: { question: true },
            },
          },
        });
      }

      if (activePackage?.packageQuestions) {
        questionsSnapshot = activePackage.packageQuestions.map((pq: any, idx: number) => ({
          questionId: pq.questionId,
          questionText: pq.question.question,
          interviewerGuidance: pq.question.interviewerGuidance,
          sortOrder: pq.sortOrder || (idx + 1),
          isCustomQuestion: false,
        }));
      }
    }

    // Existing question notes
    let existingNotes = interview.questionNotes || [];
    existingNotes.sort((a, b) => a.sortOrder - b.sortOrder);

    // Find photo from documents
    const photoDoc = interview.registration.documents.find(
      (d) => d.documentType === 'PHOTO',
    );

    return {
      interviewId: interview.id,
      registrationId: interview.registrationId,
      status: interview.status,
      checkedInAt: interview.checkedInAt,
      startedAt: interview.startedAt,
      completedAt: interview.completedAt,
      generalNotes: interview.generalNotes,
      recommendation: interview.recommendation,
      totalScore: Number(interview.totalScore),
      percentageScore: Number(interview.percentageScore),
      // Profil Peserta
      participant: {
        fullName:
          interview.registration.studentDetail?.fullName ||
          interview.registration.user.name,
        registrationNumber: interview.registration.registrationNumber,
        schoolName: interview.registration.classProgram.major.school.name,
        majorName: interview.registration.classProgram.major.name,
        programName: interview.registration.classProgram.name,
        originSchool:
          interview.registration.studentDetail?.previousSchoolName || '-',
        phoneNumber: interview.registration.user.phoneNumber,
        documentStatus: interview.registration.formStatus,
        cbtScore: interview.registration.cbtAttempt?.totalScore
          ? Number(interview.registration.cbtAttempt.totalScore)
          : null,
        photoPath: photoDoc?.filePath || null,
      },
      // Info Wawancara
      scheduleInfo: {
        scheduleName: interview.schedule?.name || 'Sesi Wawancara',
        scheduleDate: interview.schedule?.scheduleDate || null,
        startTime: interview.schedule?.startTime || null,
        endTime: interview.schedule?.endTime || null,
        roomLocation: interview.schedule?.roomLocation || null,
        notes: interview.schedule?.notes || null,
        interviewerName:
          interview.interviewer?.name || (currentUser as any)?.name || null,
      },
      // Questions and Existing Notes
      questions: questionsSnapshot,
      questionsSnapshot,
      existingQuestionNotes: existingNotes,
      questionNotes: existingNotes,
    };
  }

  async saveInterviewAssessment(
    interviewId: string,
    dto: SaveInterviewAssessmentDto,
    currentUser: { id: string; name: string; role: Role },
  ) {
    let interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        registration: true,
        schedule: {
          include: {
            interviewers: true,
          },
        },
      },
    });

    if (!interview) {
      interview = await this.prisma.interview.findFirst({
        where: { registrationId: interviewId },
        include: {
          registration: true,
          schedule: {
            include: {
              interviewers: true,
            },
          },
        },
      });
    }

    if (!interview) throw new NotFoundException('Data wawancara tidak ditemukan.');
    const actualInterviewId = interview.id;

    // Authorization check
    if (currentUser.role === Role.PEWAWANCARA) {
      const isAssigned =
        interview.interviewerId === currentUser.id ||
        interview.schedule?.interviewers.some(
          (si) => si.interviewerUserId === currentUser.id,
        );
      if (!isAssigned) {
        throw new ForbiddenException(
          'Anda tidak memiliki akses untuk menilai peserta ini.',
        );
      }

      if (interview.status === InterviewStatus.COMPLETED) {
        throw new BadRequestException(
          'Wawancara sudah selesai dan dikunci. Hanya Super Admin yang dapat membuka/mengubah hasil.',
        );
      }
    }

    const newStatus = dto.isComplete
      ? InterviewStatus.COMPLETED
      : InterviewStatus.IN_PROGRESS;

    const now = new Date();

    // Execute atomic update
    await this.prisma.$transaction(async (tx) => {
      // Delete old notes and re-insert updated notes
      await tx.interviewQuestionNote.deleteMany({ where: { interviewId: actualInterviewId } });

      if (dto.questionNotes && dto.questionNotes.length > 0) {
        await tx.interviewQuestionNote.createMany({
          data: dto.questionNotes.map((qn, idx) => ({
            interviewId: actualInterviewId,
            questionId: qn.questionId || null,
            questionText: qn.questionText,
            categoryName: qn.categoryName || null,
            notes: qn.notes || null,
            isCustomQuestion: qn.isCustomQuestion ?? false,
            sortOrder: qn.sortOrder ?? (idx + 1),
          })),
        });
      }

      // Snapshot questions if not already captured
      let snapshotQuestionsJson = interview.snapshotQuestionsJson;
      if (!snapshotQuestionsJson && dto.questionNotes && dto.questionNotes.length > 0) {
        snapshotQuestionsJson = JSON.stringify(
          dto.questionNotes.map((qn, idx) => ({
            questionText: qn.questionText,
            sortOrder: qn.sortOrder ?? (idx + 1),
            isCustomQuestion: qn.isCustomQuestion ?? false,
          })),
        );
      }

      // Update interview record
      await tx.interview.update({
        where: { id: actualInterviewId },
        data: {
          interviewerId: interview.interviewerId || currentUser.id,
          status: newStatus,
          generalNotes: dto.generalNotes,
          recommendation: dto.recommendation,
          startedAt: interview.startedAt || now,
          ...(dto.isComplete && { completedAt: now }),
          ...(snapshotQuestionsJson && { snapshotQuestionsJson }),
        },
      });
    });

    return {
      success: true,
      message: dto.isComplete
        ? 'Wawancara telah selesai dan hasil berhasil disimpan.'
        : 'Draft wawancara berhasil disimpan.',
      data: {
        interviewId: actualInterviewId,
        status: newStatus,
        recommendation: dto.recommendation,
      },
    };
  }

  async adminUpdateInterview(
    interviewId: string,
    dto: AdminUpdateInterviewDto,
    currentUser: { id: string; name: string; role: Role },
  ) {
    const existing = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!existing) throw new NotFoundException('Data wawancara tidak ditemukan.');

    // Save assessment
    const res = await this.saveInterviewAssessment(
      interviewId,
      {
        ...dto,
        isComplete: true,
      },
      currentUser,
    );

    // Write to audit log
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'UPDATE_INTERVIEW_RESULT',
        targetTable: 'interviews',
        targetId: interviewId,
        details: JSON.stringify({
          reason: dto.auditReason,
          previousTotalScore: existing.totalScore,
          previousStatus: existing.status,
          updatedBy: (currentUser as any)?.name || 'Admin',
        }),
      },
    });

    return res;
  }

  // ==========================================================================
  // 10. DASHBOARD STATS
  // ==========================================================================

  async getAdminDashboardStats(academicPeriodId?: string) {
    const whereReg: Prisma.RegistrationWhereInput = {};
    if (academicPeriodId) whereReg.academicPeriodId = academicPeriodId;

    const [
      totalRegistrants,
      scheduledCount,
      checkedInCount,
      inProgressCount,
      completedCount,
      absentCount,
    ] = await Promise.all([
      this.prisma.registration.count({ where: whereReg }),
      this.prisma.interview.count({
        where: {
          status: InterviewStatus.SCHEDULED,
          ...(academicPeriodId && {
            registration: { academicPeriodId },
          }),
        },
      }),
      this.prisma.interview.count({
        where: {
          status: InterviewStatus.CHECKED_IN,
          ...(academicPeriodId && {
            registration: { academicPeriodId },
          }),
        },
      }),
      this.prisma.interview.count({
        where: {
          status: InterviewStatus.IN_PROGRESS,
          ...(academicPeriodId && {
            registration: { academicPeriodId },
          }),
        },
      }),
      this.prisma.interview.count({
        where: {
          status: InterviewStatus.COMPLETED,
          ...(academicPeriodId && {
            registration: { academicPeriodId },
          }),
        },
      }),
      this.prisma.interview.count({
        where: {
          status: InterviewStatus.ABSENT,
          ...(academicPeriodId && {
            registration: { academicPeriodId },
          }),
        },
      }),
    ]);

    const totalInterviewed =
      scheduledCount +
      checkedInCount +
      inProgressCount +
      completedCount +
      absentCount;

    const notScheduledCount = Math.max(0, totalRegistrants - totalInterviewed);

    // Today's schedules
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySchedules = await this.prisma.interviewSchedule.findMany({
      where: {
        scheduleDate: {
          gte: today,
          lt: tomorrow,
        },
        ...(academicPeriodId && { academicPeriodId }),
      },
      include: {
        interviewers: { include: { interviewer: true } },
        _count: { select: { interviews: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    const formattedTodaySchedules = todaySchedules.map((s) => ({
      id: s.id,
      time: `${s.startTime} - ${s.endTime}`,
      room: s.roomLocation,
      interviewers: s.interviewers.map((i) => i.interviewer.name).join(', '),
      participantsRatio: `${s._count.interviews}/${s.quota}`,
      status: s.status,
    }));

    // Active interviewers
    const interviewers = await this.prisma.user.findMany({
      where: { role: Role.PEWAWANCARA, isActive: true },
      take: 6,
      select: {
        id: true,
        name: true,
        assignedInterviews: {
          select: { status: true },
        },
        interviewerSchedules: { select: { id: true } },
      },
    });

    const formattedInterviewers = interviewers.map((u) => ({
      id: u.id,
      name: u.name,
      scheduleCount: u.interviewerSchedules.length,
      completedCount: u.assignedInterviews.filter(
        (i) => i.status === InterviewStatus.COMPLETED,
      ).length,
    }));

    // Uninterviewed participants list
    const unInterviewedParticipants = await this.prisma.registration.findMany({
      where: {
        OR: [
          { interview: null },
          {
            interview: {
              status: {
                in: [InterviewStatus.NOT_SCHEDULED, InterviewStatus.SCHEDULED],
              },
            },
          },
        ],
        ...(academicPeriodId && { academicPeriodId }),
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        studentDetail: true,
        classProgram: true,
        cbtAttempt: true,
        interview: {
          include: { schedule: true },
        },
      },
    });

    const formattedUnInterviewed = unInterviewedParticipants.map((r) => ({
      id: r.id,
      registrationNumber: r.registrationNumber,
      name: r.studentDetail?.fullName || r.user.name || 'Peserta',
      program: r.classProgram.name,
      cbtScore: r.cbtAttempt?.totalScore
        ? Number(r.cbtAttempt.totalScore)
        : '-',
      schedule: r.interview?.schedule
        ? `${r.interview.schedule.startTime} (${r.interview.schedule.roomLocation})`
        : 'Belum Dijadwalkan',
    }));

    return {
      summary: {
        totalRegistrants,
        totalParticipants: totalRegistrants,
        notScheduled: notScheduledCount,
        scheduled: scheduledCount,
        checkedIn: checkedInCount,
        inProgress: inProgressCount,
        completed: completedCount,
        absent: absentCount,
      },
      todaySchedules: formattedTodaySchedules,
      activeInterviewers: formattedInterviewers,
      uninterviewedParticipants: formattedUnInterviewed,
    };
  }

  async getInterviewerDashboardStats(interviewerUserId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      allAssigned,
      completedCount,
      inProgressCount,
      todaySchedules,
      nextSchedule,
    ] = await Promise.all([
      this.prisma.interview.count({
        where: { interviewerId: interviewerUserId },
      }),
      this.prisma.interview.count({
        where: {
          interviewerId: interviewerUserId,
          status: InterviewStatus.COMPLETED,
        },
      }),
      this.prisma.interview.count({
        where: {
          interviewerId: interviewerUserId,
          status: InterviewStatus.IN_PROGRESS,
        },
      }),
      this.prisma.interviewSchedule.findMany({
        where: {
          interviewers: { some: { interviewerUserId } },
          scheduleDate: { gte: today, lt: tomorrow },
        },
        include: {
          package: true,
          _count: { select: { interviews: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.interviewSchedule.findFirst({
        where: {
          interviewers: { some: { interviewerUserId } },
          scheduleDate: { gte: today },
        },
        include: { package: true },
        orderBy: [{ scheduleDate: 'asc' }, { startTime: 'asc' }],
      }),
    ]);

    const pendingCount = Math.max(0, allAssigned - completedCount);

    return {
      totalAssigned: allAssigned,
      pendingCount,
      inProgressCount,
      completedCount,
      todaySchedulesCount: todaySchedules.length,
      todaySchedules,
      nextSchedule,
    };
  }

  // ==========================================================================
  // 11. REKAP & HASIL WAWANCARA
  // ==========================================================================

  async getInterviewResults(
    search?: string,
    academicPeriodId?: string,
    admissionWaveId?: string,
    schoolId?: string,
    majorId?: string,
    classProgramId?: string,
    scheduleId?: string,
    interviewerId?: string,
    status?: InterviewStatus,
    recommendation?: InterviewRecommendation,
    page = 1,
    perPage = 25,
  ) {
    const where: Prisma.InterviewWhereInput = {};

    if (status) where.status = status;
    if (recommendation) where.recommendation = recommendation;
    if (scheduleId) where.scheduleId = scheduleId;
    if (interviewerId) where.interviewerId = interviewerId;

    if (academicPeriodId || admissionWaveId || classProgramId || schoolId || majorId || search) {
      where.registration = {
        ...(academicPeriodId && { academicPeriodId }),
        ...(admissionWaveId && { admissionWaveId }),
        ...(classProgramId && { classProgramId }),
        ...(schoolId && {
          classProgram: { major: { schoolId } },
        }),
        ...(majorId && {
          classProgram: { majorId },
        }),
        ...(search && {
          OR: [
            { registrationNumber: { contains: search, mode: 'insensitive' } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            {
              studentDetail: {
                fullName: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        }),
      };
    }

    const skip = (page - 1) * perPage;
    const [total, data] = await Promise.all([
      this.prisma.interview.count({ where }),
      this.prisma.interview.findMany({
        where,
        skip,
        take: perPage,
        orderBy: [{ totalScore: 'desc' }, { createdAt: 'desc' }],
        include: {
          registration: {
            include: {
              user: true,
              studentDetail: true,
              classProgram: {
                include: { major: { include: { school: true } } },
              },
              academicPeriod: true,
              cbtAttempt: true,
            },
          },
          schedule: true,
          interviewer: {
            select: { id: true, name: true, email: true, phoneNumber: true },
          },
          package: true,
          scores: true,
        },
      }),
    ]);

    const formatted = data.map((i) => ({
      interviewId: i.id,
      registrationId: i.registrationId,
      registrationNumber: i.registration.registrationNumber,
      participantName:
        i.registration.studentDetail?.fullName ||
        i.registration.user.name ||
        'Calon Santri',
      schoolName: i.registration.classProgram.major.school.name,
      programName: i.registration.classProgram.name,
      originSchool: i.registration.studentDetail?.previousSchoolName || '-',
      cbtScore: i.registration.cbtAttempt?.totalScore
        ? Number(i.registration.cbtAttempt.totalScore)
        : null,
      interviewerName: i.interviewer?.name || '-',
      scheduleDate: i.schedule?.scheduleDate || null,
      scheduleTime: i.schedule
        ? `${i.schedule.startTime} - ${i.schedule.endTime}`
        : '-',
      roomLocation: i.schedule?.roomLocation || '-',
      totalScore: Number(i.totalScore),
      percentageScore: Number(i.percentageScore),
      recommendation: i.recommendation,
      status: i.status,
      completedAt: i.completedAt,
    }));

    return {
      data: formatted,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  // ==========================================================================
  // 12. INFO WAWANCARA PESERTA
  // ==========================================================================

  async getParticipantInterviewInfo(userId: string) {
    const reg = await this.prisma.registration.findFirst({
      where: { userId },
      include: {
        classProgram: true,
        interview: {
          include: {
            schedule: true,
            interviewer: { select: { name: true } },
            package: true,
          },
        },
      },
    });

    if (!reg) return null;

    return {
      registrationNumber: reg.registrationNumber,
      programName: reg.classProgram.name,
      interview: reg.interview
        ? {
            status: reg.interview.status,
            scheduleDate: reg.interview.schedule?.scheduleDate || null,
            startTime: reg.interview.schedule?.startTime || null,
            endTime: reg.interview.schedule?.endTime || null,
            roomLocation: reg.interview.schedule?.roomLocation || null,
            interviewerName: reg.interview.interviewer?.name || null,
            checkedInAt: reg.interview.checkedInAt || null,
            totalScore: reg.interview.totalScore
              ? Number(reg.interview.totalScore)
              : null,
            recommendation: reg.interview.recommendation || null,
          }
        : null,
    };
  }
}
