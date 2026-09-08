import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Role,
  RegistrationStatus,
  FormStatus,
  CBTQuestionType,
  CBTAttemptStatus,
  CBTGradingStatus,
  CBTVerificationStatus,
  Prisma,
} from '@prisma/client';
import {
  CreateCbtExamDto,
  UpdateCbtExamDto,
  CreateCbtQuestionDto,
  UpdateCbtQuestionDto,
  SubmitCbtAnswerDto,
  GradeCbtEssayDto,
  VerifyCbtAttemptDto,
  RejectCbtAttemptDto,
} from './dto/cbt.dto';

@Injectable()
export class CbtService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // 1. SUPER ADMIN: DASHBOARD & EXAM MANAGEMENT
  // ==========================================================================

  /**
   * Returns high-level statistics and the hierarchical tree of schools, majors,
   * class programs with their CBT exam status.
   */
  async getAdminDashboardStats() {
    // 1. Total Eligible Candidates
    const eligibleCount = await this.prisma.registration.count({
      where: {
        formStatus: FormStatus.VERIFIED,
      },
    });

    // 2. Count by Attempt Status for Eligible Registrations
    const [inProgressCount, completedCount] = await Promise.all([
      this.prisma.cBTAttempt.count({
        where: {
          status: CBTAttemptStatus.IN_PROGRESS,
          registration: {
            formStatus: FormStatus.VERIFIED,
          },
        },
      }),
      this.prisma.cBTAttempt.count({
        where: {
          status: {
            in: [CBTAttemptStatus.COMPLETED, CBTAttemptStatus.EXPIRED],
          },
          registration: {
            formStatus: FormStatus.VERIFIED,
          },
        },
      }),
    ]);

    const notStartedCount = Math.max(
      0,
      eligibleCount - inProgressCount - completedCount,
    );

    // 3. Hierarchical Master Tree (School -> Major -> ClassProgram -> CBTExam)
    const schools = await this.prisma.school.findMany({
      orderBy: { name: 'asc' },
      include: {
        majors: {
          orderBy: { name: 'asc' },
          include: {
            classPrograms: {
              orderBy: { name: 'asc' },
              include: {
                cbtExam: {
                  include: {
                    _count: {
                      select: { questions: true, attempts: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const structure = schools.map((school) => ({
      id: school.id,
      name: school.name,
      initial: school.initial,
      majors: school.majors.map((major) => ({
        id: major.id,
        name: major.name,
        classPrograms: major.classPrograms.map((cp) => ({
          id: cp.id,
          name: cp.name,
          exam: cp.cbtExam
            ? {
                id: cp.cbtExam.id,
                title: cp.cbtExam.title,
                durationMinutes: cp.cbtExam.durationMinutes,
                isActive: cp.cbtExam.isActive,
                totalQuestions: cp.cbtExam._count.questions,
                totalAttempts: cp.cbtExam._count.attempts,
              }
            : null,
        })),
      })),
    }));

    return {
      stats: {
        eligibleCount,
        notStartedCount,
        inProgressCount,
        completedCount,
      },
      structure,
    };
  }

  /**
   * Retrieves exam configuration and questions for a specific Class Program.
   */
  async getExamByProgram(classProgramId: string) {
    const classProgram = await this.prisma.classProgram.findUnique({
      where: { id: classProgramId },
      include: {
        major: {
          include: {
            school: true,
          },
        },
        cbtExam: {
          include: {
            questions: {
              orderBy: { orderNumber: 'asc' },
              include: {
                options: {
                  orderBy: { orderNumber: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!classProgram) {
      throw new NotFoundException('Program Kelas tidak ditemukan.');
    }

    return {
      classProgram: {
        id: classProgram.id,
        name: classProgram.name,
        majorName: classProgram.major.name,
        schoolName: classProgram.major.school.name,
      },
      exam: classProgram.cbtExam,
    };
  }

  /**
   * Creates a new CBT Exam configuration for a Class Program.
   */
  async createExam(dto: CreateCbtExamDto) {
    const cp = await this.prisma.classProgram.findUnique({
      where: { id: dto.classProgramId },
      include: { cbtExam: true },
    });

    if (!cp) {
      throw new NotFoundException('Program Kelas tidak ditemukan.');
    }

    if (cp.cbtExam) {
      throw new BadRequestException(
        'Ujian CBT untuk Program Kelas ini sudah dibuat.',
      );
    }

    const exam = await this.prisma.cBTExam.create({
      data: {
        classProgramId: dto.classProgramId,
        title: dto.title || `Ujian CBT — ${cp.name}`,
        description: dto.description,
        durationMinutes: dto.durationMinutes || 60,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        questions: true,
      },
    });

    return exam;
  }

  /**
   * Updates CBT Exam settings (duration, active status, title).
   */
  async updateExam(examId: string, dto: UpdateCbtExamDto) {
    const exam = await this.prisma.cBTExam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('Ujian CBT tidak ditemukan.');
    }

    const updated = await this.prisma.cBTExam.update({
      where: { id: examId },
      data: {
        title: dto.title,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        isActive: dto.isActive,
      },
    });

    return updated;
  }

  /**
   * Adds a question (Multiple Choice or Essay) to an exam.
   */
  async addQuestion(examId: string, dto: CreateCbtQuestionDto) {
    const exam = await this.prisma.cBTExam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });

    if (!exam) {
      throw new NotFoundException('Ujian CBT tidak ditemukan.');
    }

    if (dto.type === CBTQuestionType.MULTIPLE_CHOICE) {
      if (!dto.options || dto.options.length < 4) {
        throw new BadRequestException(
          'Soal Pilihan Ganda minimal harus memiliki 4 pilihan jawaban.',
        );
      }
      const hasCorrect = dto.options.some((o) => o.isCorrect);
      if (!hasCorrect) {
        throw new BadRequestException(
          'Pilihlah minimal satu kunci jawaban yang benar untuk Pilihan Ganda.',
        );
      }
    }

    const orderNumber = dto.orderNumber ?? exam.questions.length + 1;

    return this.prisma.$transaction(async (tx) => {
      const question = await tx.cBTQuestion.create({
        data: {
          examId,
          type: dto.type,
          question: dto.question,
          score: new Prisma.Decimal(dto.score),
          orderNumber,
        },
      });

      if (
        dto.type === CBTQuestionType.MULTIPLE_CHOICE &&
        dto.options &&
        dto.options.length > 0
      ) {
        await tx.cBTQuestionOption.createMany({
          data: dto.options.map((opt, idx) => ({
            questionId: question.id,
            content: opt.content,
            isCorrect: !!opt.isCorrect,
            orderNumber: opt.orderNumber ?? idx + 1,
          })),
        });
      }

      return tx.cBTQuestion.findUnique({
        where: { id: question.id },
        include: { options: { orderBy: { orderNumber: 'asc' } } },
      });
    });
  }

  /**
   * Updates an existing question and its options.
   */
  async updateQuestion(questionId: string, dto: UpdateCbtQuestionDto) {
    const question = await this.prisma.cBTQuestion.findUnique({
      where: { id: questionId },
      include: { options: true },
    });

    if (!question) {
      throw new NotFoundException('Soal tidak ditemukan.');
    }

    if (
      question.type === CBTQuestionType.MULTIPLE_CHOICE &&
      dto.options !== undefined
    ) {
      if (!dto.options || dto.options.length < 4) {
        throw new BadRequestException(
          'Soal Pilihan Ganda minimal harus memiliki 4 pilihan jawaban.',
        );
      }
      const hasCorrect = dto.options.some((o) => o.isCorrect);
      if (!hasCorrect) {
        throw new BadRequestException(
          'Pilihlah minimal satu kunci jawaban yang benar untuk Pilihan Ganda.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.cBTQuestion.update({
        where: { id: questionId },
        data: {
          question: dto.question,
          score: dto.score ? new Prisma.Decimal(dto.score) : undefined,
          orderNumber: dto.orderNumber,
        },
      });

      if (
        question.type === CBTQuestionType.MULTIPLE_CHOICE &&
        dto.options &&
        dto.options.length > 0
      ) {
        // Delete old options and re-create for simplicity & cleanliness
        await tx.cBTQuestionOption.deleteMany({ where: { questionId } });
        await tx.cBTQuestionOption.createMany({
          data: dto.options.map((opt, idx) => ({
            questionId,
            content: opt.content,
            isCorrect: !!opt.isCorrect,
            orderNumber: opt.orderNumber ?? idx + 1,
          })),
        });
      }

      return tx.cBTQuestion.findUnique({
        where: { id: questionId },
        include: { options: { orderBy: { orderNumber: 'asc' } } },
      });
    });
  }

  /**
   * Deletes a question and its options.
   */
  async deleteQuestion(questionId: string) {
    const question = await this.prisma.cBTQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException('Soal tidak ditemukan.');
    }

    await this.prisma.cBTQuestion.delete({ where: { id: questionId } });
    return { success: true, message: 'Soal berhasil dihapus.' };
  }

  /**
   * Imports a batch of questions (Multiple Choice and/or Essay) into an exam.
   */
  async importQuestions(examId: string, questions: CreateCbtQuestionDto[]) {
    const exam = await this.prisma.cBTExam.findUnique({
      where: { id: examId },
      include: { questions: { select: { orderNumber: true } } },
    });

    if (!exam) {
      throw new NotFoundException('Ujian CBT tidak ditemukan.');
    }

    if (!questions || questions.length === 0) {
      throw new BadRequestException('Daftar soal yang akan diimpor tidak boleh kosong.');
    }

    // Determine current max orderNumber
    let currentMaxOrder = 0;
    if (exam.questions && exam.questions.length > 0) {
      currentMaxOrder = Math.max(...exam.questions.map((q) => q.orderNumber || 0));
    }

    return this.prisma.$transaction(async (tx) => {
      const createdQuestions = [];

      for (let i = 0; i < questions.length; i++) {
        const qDto = questions[i];
        const nextOrder = qDto.orderNumber || currentMaxOrder + i + 1;

        if (qDto.type === CBTQuestionType.MULTIPLE_CHOICE) {
          if (!qDto.options || qDto.options.length < 2) {
            throw new BadRequestException(
              `Soal No. ${i + 1} (${qDto.question.substring(0, 30)}...): Soal Pilihan Ganda minimal harus memiliki 2 pilihan jawaban.`,
            );
          }
          const hasCorrect = qDto.options.some((o) => o.isCorrect);
          if (!hasCorrect) {
            throw new BadRequestException(
              `Soal No. ${i + 1} (${qDto.question.substring(0, 30)}...): Harap tentukan minimal satu kunci jawaban yang benar.`,
            );
          }
        }

        const created = await tx.cBTQuestion.create({
          data: {
            examId,
            type: qDto.type,
            question: qDto.question,
            score: new Prisma.Decimal(qDto.score || 5),
            orderNumber: nextOrder,
            options:
              qDto.type === CBTQuestionType.MULTIPLE_CHOICE && qDto.options
                ? {
                    create: qDto.options.map((opt, optIdx) => ({
                      content: opt.content,
                      isCorrect: !!opt.isCorrect,
                      orderNumber: opt.orderNumber ?? optIdx + 1,
                    })),
                  }
                : undefined,
          },
          include: {
            options: true,
          },
        });

        createdQuestions.push(created);
      }

      return {
        success: true,
        count: createdQuestions.length,
        message: `Berhasil mengimpor ${createdQuestions.length} butir soal ke ujian CBT.`,
        data: createdQuestions,
      };
    });
  }

  // ==========================================================================
  // 2. SUPER ADMIN: RESULTS & ESSAY GRADING
  // ==========================================================================

  /**
   * Retrieves results for all registered eligible candidates with filters.
   */
  async getAdminResults(query: {
    schoolId?: string;
    majorId?: string;
    classProgramId?: string;
    attemptStatus?: string;
    gradingStatus?: string;
    search?: string;
  }) {
    const whereClause: Prisma.RegistrationWhereInput = {
      formStatus: FormStatus.VERIFIED,
    };

    if (query.classProgramId) {
      whereClause.classProgramId = query.classProgramId;
    } else if (query.majorId) {
      whereClause.classProgram = { majorId: query.majorId };
    } else if (query.schoolId) {
      whereClause.classProgram = { major: { schoolId: query.schoolId } };
    }

    const attemptConditions: Prisma.CBTAttemptWhereInput = {};
    let isNullAttempt = false;

    if (query.attemptStatus) {
      if (query.attemptStatus === 'NOT_STARTED') {
        isNullAttempt = true;
      } else {
        attemptConditions.status = query.attemptStatus as CBTAttemptStatus;
      }
    }

    if (query.gradingStatus) {
      attemptConditions.gradingStatus = query.gradingStatus as CBTGradingStatus;
    }

    if (isNullAttempt) {
      whereClause.cbtAttempt = null;
    } else if (Object.keys(attemptConditions).length > 0) {
      whereClause.cbtAttempt = { is: attemptConditions };
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      whereClause.OR = [
        { registrationNumber: { contains: s, mode: 'insensitive' } },
        {
          individualParticipant: {
            fullName: { contains: s, mode: 'insensitive' },
          },
        },
        { studentDetail: { fullName: { contains: s, mode: 'insensitive' } } },
        { user: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const registrations = await this.prisma.registration.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        individualParticipant: true,
        studentDetail: true,
        classProgram: {
          include: {
            major: {
              include: {
                school: true,
              },
            },
            cbtExam: true,
          },
        },
        cbtAttempt: {
          include: {
            gradedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    return registrations.map((r) => {
      const candidateName =
        r.studentDetail?.fullName ||
        r.individualParticipant?.fullName ||
        r.user.name;

      const attempt = r.cbtAttempt;

      return {
        registrationId: r.id,
        registrationNumber: r.registrationNumber,
        candidateName,
        schoolName: r.classProgram.major.school.name,
        majorName: r.classProgram.major.name,
        classProgramName: r.classProgram.name,
        hasExamConfigured: !!r.classProgram.cbtExam,
        attempt: attempt
          ? {
              id: attempt.id,
              status: attempt.status,
              startedAt: attempt.startedAt,
              completedAt: attempt.completedAt,
              multipleChoiceScore: Number(attempt.multipleChoiceScore),
              essayScore: Number(attempt.essayScore),
              totalScore: Number(attempt.totalScore),
              gradingStatus: attempt.gradingStatus,
              gradedBy: attempt.gradedBy?.name || null,
              gradedAt: attempt.gradedAt,
            }
          : null,
      };
    });
  }

  /**
   * Retrieves detailed attempt answers and essay questions for admin correction.
   */
  async getAdminAttemptDetail(attemptId: string) {
    const attempt = await this.prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
      include: {
        registration: {
          include: {
            user: true,
            studentDetail: true,
            individualParticipant: true,
            classProgram: {
              include: {
                major: {
                  include: {
                    school: true,
                  },
                },
              },
            },
          },
        },
        exam: true,
        attemptQuestions: {
          orderBy: { questionOrder: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { orderNumber: 'asc' } },
              },
            },
          },
        },
        answers: {
          include: {
            selectedOption: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Data hasil ujian tidak ditemukan.');
    }

    const reg = attempt.registration;
    const candidateName =
      reg.studentDetail?.fullName ||
      reg.individualParticipant?.fullName ||
      reg.user.name;

    const answersMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

    const questionsDetail = attempt.attemptQuestions.map((aq) => {
      const q = aq.question;
      const ans = answersMap.get(q.id);

      return {
        questionOrder: aq.questionOrder,
        questionId: q.id,
        type: q.type,
        questionText: q.question,
        maxScore: Number(q.score),
        isFlagged: aq.isFlagged,
        options:
          q.type === CBTQuestionType.MULTIPLE_CHOICE
            ? q.options.map((o) => ({
                id: o.id,
                content: o.content,
                isCorrect: o.isCorrect,
              }))
            : [],
        answer: ans
          ? {
              id: ans.id,
              selectedOptionId: ans.selectedOptionId,
              selectedOptionContent: ans.selectedOption?.content || null,
              essayAnswer: ans.essayAnswer,
              isCorrect: ans.isCorrect,
              score: Number(ans.score),
              essayFeedback: ans.essayFeedback,
            }
          : null,
      };
    });

    return {
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        multipleChoiceScore: Number(attempt.multipleChoiceScore),
        essayScore: Number(attempt.essayScore),
        totalScore: Number(attempt.totalScore),
        gradingStatus: attempt.gradingStatus,
      },
      candidate: {
        registrationId: reg.id,
        registrationNumber: reg.registrationNumber,
        name: candidateName,
        schoolName: reg.classProgram.major.school.name,
        majorName: reg.classProgram.major.name,
        classProgramName: reg.classProgram.name,
      },
      examTitle: attempt.exam.title,
      durationMinutes: attempt.exam.durationMinutes,
      questions: questionsDetail,
    };
  }

  /**
   * Submits manual grades for essay questions and recomputes total score.
   */
  async gradeEssay(
    attemptId: string,
    graderUserId: string,
    dto: GradeCbtEssayDto,
  ) {
    const attempt = await this.prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            questions: true,
          },
        },
        answers: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Data hasil ujian tidak ditemukan.');
    }

    const questionMap = new Map(
      attempt.exam.questions.map((q) => [q.id, q]),
    );

    await this.prisma.$transaction(async (tx) => {
      for (const gradeItem of dto.grades) {
        const q = questionMap.get(gradeItem.questionId);
        if (!q) continue;

        const maxScore = Number(q.score);
        if (gradeItem.score < 0 || gradeItem.score > maxScore) {
          throw new BadRequestException(
            `Nilai untuk soal essay '${q.question.substring(0, 30)}...' tidak boleh melebihi nilai maksimal (${maxScore}).`,
          );
        }

        await tx.cBTAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: gradeItem.questionId,
            },
          },
          create: {
            attemptId,
            questionId: gradeItem.questionId,
            score: new Prisma.Decimal(gradeItem.score),
            essayFeedback: gradeItem.feedback,
            isCorrect: gradeItem.score > 0,
          },
          update: {
            score: new Prisma.Decimal(gradeItem.score),
            essayFeedback: gradeItem.feedback,
            isCorrect: gradeItem.score > 0,
          },
        });
      }

      // Recompute essay score
      const allAnswers = await tx.cBTAnswer.findMany({
        where: { attemptId },
        include: { question: true },
      });

      let essayScore = 0;
      let mcScore = 0;

      for (const ans of allAnswers) {
        if (ans.question.type === CBTQuestionType.ESSAY) {
          essayScore += Number(ans.score);
        } else if (ans.question.type === CBTQuestionType.MULTIPLE_CHOICE) {
          mcScore += Number(ans.score);
        }
      }

      const totalScore = mcScore + essayScore;

      await tx.cBTAttempt.update({
        where: { id: attemptId },
        data: {
          multipleChoiceScore: new Prisma.Decimal(mcScore),
          essayScore: new Prisma.Decimal(essayScore),
          totalScore: new Prisma.Decimal(totalScore),
          gradingStatus: CBTGradingStatus.GRADED,
          gradedByUserId: graderUserId,
          gradedAt: new Date(),
        },
      });
    });    return { success: true, message: 'Penilaian essay berhasil disimpan.' };
  }

  // ==========================================================================
  // 2.1 SUPER ADMIN: CBT VERIFICATIONS (VERIFIKASI CBT)
  // ==========================================================================

  /**
   * Retrieves list of completed CBT attempts for verification with filter and search.
   */
  async getAdminVerifications(query: {
    schoolId?: string;
    majorId?: string;
    classProgramId?: string;
    verificationStatus?: string;
    search?: string;
  }) {
    const whereClause: Prisma.RegistrationWhereInput = {
      formStatus: FormStatus.VERIFIED,
      cbtAttempt: {
        is: {
          status: {
            in: [CBTAttemptStatus.COMPLETED, CBTAttemptStatus.EXPIRED],
          },
        },
      },
    };

    if (query.classProgramId) {
      whereClause.classProgramId = query.classProgramId;
    } else if (query.majorId) {
      whereClause.classProgram = { majorId: query.majorId };
    } else if (query.schoolId) {
      whereClause.classProgram = { major: { schoolId: query.schoolId } };
    }

    if (query.verificationStatus) {
      whereClause.cbtAttempt = {
        is: {
          status: {
            in: [CBTAttemptStatus.COMPLETED, CBTAttemptStatus.EXPIRED],
          },
          verificationStatus: query.verificationStatus as CBTVerificationStatus,
        },
      };
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      whereClause.OR = [
        { registrationNumber: { contains: s, mode: 'insensitive' } },
        {
          individualParticipant: {
            fullName: { contains: s, mode: 'insensitive' },
          },
        },
        { studentDetail: { fullName: { contains: s, mode: 'insensitive' } } },
        { user: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const registrations = await this.prisma.registration.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: true,
        individualParticipant: true,
        studentDetail: true,
        classProgram: {
          include: {
            major: {
              include: {
                school: true,
              },
            },
          },
        },
        cbtAttempt: {
          include: {
            verifiedBy: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return registrations.map((r) => {
      const att = r.cbtAttempt!;
      const studentName =
        r.studentDetail?.fullName ||
        r.individualParticipant?.fullName ||
        r.user.name;
      const schoolOrigin =
        r.studentDetail?.previousSchoolName ||
        r.individualParticipant?.schoolName ||
        '-';

      return {
        registrationId: r.id,
        registrationNumber: r.registrationNumber,
        candidateName: studentName,
        schoolOrigin: schoolOrigin,
        schoolName: r.classProgram.major.school.name,
        majorName: r.classProgram.major.name,
        classProgramName: r.classProgram.name,
        attemptId: att.id,
        attemptStatus: att.status,
        completedAt: att.completedAt,
        multipleChoiceScore: Number(att.multipleChoiceScore),
        essayScore: Number(att.essayScore),
        totalScore: Number(att.totalScore),
        gradingStatus: att.gradingStatus,
        verificationStatus: att.verificationStatus,
        verificationNotes: att.verificationNotes,
        verifiedAt: att.verifiedAt,
        verifiedByName: att.verifiedBy?.name || null,
      };
    });
  }

  /**
   * Verifies (Passes) a candidate's CBT attempt.
   */
  async verifyAttempt(
    attemptId: string,
    adminUserId: string,
    dto: VerifyCbtAttemptDto,
  ) {
    const attempt = await this.prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
      include: { registration: true },
    });

    if (!attempt) {
      throw new NotFoundException('Data ujian santri tidak ditemukan.');
    }

    const updated = await this.prisma.cBTAttempt.update({
      where: { id: attemptId },
      data: {
        verificationStatus: CBTVerificationStatus.VERIFIED,
        verifiedByUserId: adminUserId,
        verifiedAt: new Date(),
        verificationNotes: dto.notes || null,
      },
    });

    return {
      success: true,
      message: 'Ujian CBT calon santri berhasil diverifikasi (LULUS CBT). Calon santri dapat lanjut ke tahap wawancara.',
      data: updated,
    };
  }

  /**
   * Rejects (Fails) a candidate's CBT attempt.
   */
  async rejectAttempt(
    attemptId: string,
    adminUserId: string,
    dto: RejectCbtAttemptDto,
  ) {
    const attempt = await this.prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
      include: { registration: true },
    });

    if (!attempt) {
      throw new NotFoundException('Data ujian santri tidak ditemukan.');
    }

    const updated = await this.prisma.cBTAttempt.update({
      where: { id: attemptId },
      data: {
        verificationStatus: CBTVerificationStatus.REJECTED,
        verifiedByUserId: adminUserId,
        verifiedAt: new Date(),
        verificationNotes: dto.notes || null,
      },
    });

    return {
      success: true,
      message: 'Status CBT calon santri ditandai Ditolak / Tidak Lulus CBT.',
      data: updated,
    };
  }

  /**
   * Resets a candidate's CBT attempt so they can retake the exam from scratch.
   */
  async resetAttempt(attemptId: string, adminUserId: string) {
    const attempt = await this.prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
      include: {
        registration: {
          include: {
            user: true,
            studentDetail: true,
            individualParticipant: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Data ujian santri tidak ditemukan.');
    }

    const candidateName =
      attempt.registration.studentDetail?.fullName ||
      attempt.registration.individualParticipant?.fullName ||
      attempt.registration.user.name;

    await this.prisma.cBTAttempt.delete({
      where: { id: attemptId },
    });

    return {
      success: true,
      message: `Ujian CBT untuk calon santri '${candidateName}' berhasil di-reset. Peserta dapat memulai ujian kembali dari awal.`,
    };
  }

  // ==========================================================================
  // 3. PESERTA: ELIGIBILITY, START, EXAM RUNNER & FINISH
  // ==========================================================================

  /**
   * Checks candidate's registration status and CBT eligibility.
   */
  async getPesertaStatus(userId: string) {
    const reg = await this.prisma.registration.findFirst({
      where: { userId },
      include: {
        user: true,
        studentDetail: true,
        individualParticipant: true,
        classProgram: {
          include: {
            major: {
              include: {
                school: true,
              },
            },
            cbtExam: {
              include: {
                _count: {
                  select: { questions: true },
                },
              },
            },
          },
        },
        cbtAttempt: true,
      },
    });

    if (!reg) {
      return {
        hasRegistration: false,
        eligible: false,
        isEligible: false,
        message: 'Anda belum memiliki data pendaftaran santri.',
      };
    }

    const isEligible = reg.formStatus === FormStatus.VERIFIED;

    if (!isEligible) {
      return {
        hasRegistration: true,
        eligible: false,
        isEligible: false,
        candidateName:
          reg.studentDetail?.fullName ||
          reg.individualParticipant?.fullName ||
          reg.user.name,
        registrationNumber: reg.registrationNumber,
        schoolName: reg.classProgram.major.school.name,
        majorName: reg.classProgram.major.name,
        classProgramName: reg.classProgram.name,
        reason: 'NOT_VERIFIED',
        message:
          'Ujian Online belum dapat diakses. Data pendaftaran Anda belum memenuhi persyaratan untuk mengikuti ujian.',
      };
    }

    const exam = reg.classProgram.cbtExam;

    if (!exam || !exam.isActive || exam._count.questions === 0) {
      return {
        hasRegistration: true,
        eligible: true,
        isEligible: true,
        examAvailable: false,
        candidateName:
          reg.studentDetail?.fullName ||
          reg.individualParticipant?.fullName ||
          reg.user.name,
        registrationNumber: reg.registrationNumber,
        schoolName: reg.classProgram.major.school.name,
        majorName: reg.classProgram.major.name,
        classProgramName: reg.classProgram.name,
        message:
          'Ujian Online belum tersedia untuk Program Kelas Anda. Silakan menunggu informasi dari panitia.',
      };
    }

    let attempt = reg.cbtAttempt;

    // Auto-expire check if currently in progress
    if (
      attempt &&
      attempt.status === CBTAttemptStatus.IN_PROGRESS &&
      attempt.expiresAt &&
      new Date() >= attempt.expiresAt
    ) {
      await this.autoFinishExpiredAttempt(attempt.id);
      attempt = await this.prisma.cBTAttempt.findUnique({
        where: { id: attempt.id },
      });
    }

    let attemptState = 'READY';
    if (!attempt || attempt.status === CBTAttemptStatus.NOT_STARTED) {
      attemptState = 'READY';
    } else if (attempt.status === CBTAttemptStatus.IN_PROGRESS) {
      attemptState = 'IN_PROGRESS';
    } else if (
      attempt.status === CBTAttemptStatus.COMPLETED ||
      attempt.status === CBTAttemptStatus.EXPIRED
    ) {
      attemptState = 'COMPLETED';
    }

    return {
      hasRegistration: true,
      eligible: true,
      isEligible: true,
      examAvailable: true,
      attemptState,
      candidateName:
        reg.studentDetail?.fullName ||
        reg.individualParticipant?.fullName ||
        reg.user.name,
      registrationNumber: reg.registrationNumber,
      schoolName: reg.classProgram.major.school.name,
      majorName: reg.classProgram.major.name,
      classProgramName: reg.classProgram.name,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        totalQuestions: exam._count.questions,
        durationMinutes: exam.durationMinutes,
      },
      attempt: attempt
        ? {
            id: attempt.id,
            status: attempt.status,
            startedAt: attempt.startedAt,
            expiresAt: attempt.expiresAt,
            completedAt: attempt.completedAt,
            multipleChoiceScore: Number(attempt.multipleChoiceScore),
            essayScore: Number(attempt.essayScore),
            totalScore: Number(attempt.totalScore),
            gradingStatus: attempt.gradingStatus,
            verificationStatus: attempt.verificationStatus,
            verificationNotes: attempt.verificationNotes,
            verifiedAt: attempt.verifiedAt,
          }
        : null,
    };
  }

  /**
   * Starts a CBT attempt. Shuffles questions & options and creates a permanent frozen snapshot.
   */
  async startPesertaAttempt(userId: string) {
    const reg = await this.prisma.registration.findFirst({
      where: { userId },
      include: {
        classProgram: {
          include: {
            cbtExam: {
              include: {
                questions: {
                  include: { options: true },
                },
              },
            },
          },
        },
        cbtAttempt: true,
      },
    });

    if (!reg) throw new NotFoundException('Data pendaftaran tidak ditemukan.');

    if (reg.formStatus !== FormStatus.VERIFIED) {
      throw new ForbiddenException(
        'Data pendaftaran Anda belum memenuhi syarat untuk mengikuti ujian.',
      );
    }

    const exam = reg.classProgram.cbtExam;
    if (!exam || !exam.isActive || exam.questions.length === 0) {
      throw new BadRequestException('Ujian belum tersedia untuk Program Kelas Anda.');
    }

    // If attempt already exists
    if (reg.cbtAttempt) {
      if (
        reg.cbtAttempt.status === CBTAttemptStatus.COMPLETED ||
        reg.cbtAttempt.status === CBTAttemptStatus.EXPIRED
      ) {
        throw new BadRequestException(
          'Anda sudah menyelesaikan ujian ini. Ujian hanya dapat dilakukan satu kali.',
        );
      }

      if (reg.cbtAttempt.status === CBTAttemptStatus.IN_PROGRESS) {
        if (reg.cbtAttempt.expiresAt && new Date() >= reg.cbtAttempt.expiresAt) {
          await this.autoFinishExpiredAttempt(reg.cbtAttempt.id);
          throw new BadRequestException('Waktu ujian Anda telah habis.');
        }
        return {
          success: true,
          attemptId: reg.cbtAttempt.id,
          message: 'Melanjutkan ujian yang sedang berlangsung.',
        };
      }
    }

    // Create fresh attempt with randomized question & option order snapshot
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + exam.durationMinutes * 60 * 1000,
    );

    const shuffledQuestions = this.shuffleArray([...exam.questions]);

    const result = await this.prisma.$transaction(async (tx) => {
      const attempt = await tx.cBTAttempt.create({
        data: {
          examId: exam.id,
          registrationId: reg.id,
          status: CBTAttemptStatus.IN_PROGRESS,
          startedAt: now,
          expiresAt,
        },
      });

      // Prepare snapshot rows
      const attemptQuestionsData = shuffledQuestions.map((q, idx) => {
        let optionOrderJson: string | null = null;
        if (q.type === CBTQuestionType.MULTIPLE_CHOICE && q.options.length > 0) {
          const shuffledOptions = this.shuffleArray([...q.options]);
          optionOrderJson = JSON.stringify(shuffledOptions.map((o) => o.id));
        }

        return {
          attemptId: attempt.id,
          questionId: q.id,
          questionOrder: idx + 1,
          optionOrderJson,
          isFlagged: false,
        };
      });

      await tx.cBTAttemptQuestion.createMany({
        data: attemptQuestionsData,
      });

      return attempt;
    });

    return {
      success: true,
      attemptId: result.id,
      expiresAt,
      message: 'Ujian berhasil dimulai. Waktu pengerjaan sedang berjalan.',
    };
  }

  /**
   * Retrieves active exam session with questions in frozen order and without answer keys.
   */
  async getPesertaSession(userId: string) {
    const reg = await this.prisma.registration.findFirst({
      where: { userId },
      include: {
        studentDetail: true,
        individualParticipant: true,
        user: true,
        cbtAttempt: {
          include: {
            exam: {
              include: {
                classProgram: {
                  include: {
                    major: { include: { school: true } },
                  },
                },
              },
            },
            attemptQuestions: {
              orderBy: { questionOrder: 'asc' },
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
            },
            answers: true,
          },
        },
      },
    });

    if (!reg || !reg.cbtAttempt) {
      throw new NotFoundException('Sesi ujian tidak ditemukan.');
    }

    const attempt = reg.cbtAttempt;

    if (attempt.status === CBTAttemptStatus.NOT_STARTED) {
      throw new BadRequestException('Ujian belum dimulai.');
    }

    if (
      attempt.status === CBTAttemptStatus.COMPLETED ||
      attempt.status === CBTAttemptStatus.EXPIRED
    ) {
      throw new BadRequestException('Ujian sudah selesai.');
    }

    // Check expiration
    const now = new Date();
    if (attempt.expiresAt && now >= attempt.expiresAt) {
      await this.autoFinishExpiredAttempt(attempt.id);
      throw new BadRequestException('Waktu ujian Anda telah habis.');
    }

    const remainingSeconds = attempt.expiresAt
      ? Math.max(0, Math.floor((attempt.expiresAt.getTime() - now.getTime()) / 1000))
      : 0;

    const answersMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

    const candidateName =
      reg.studentDetail?.fullName ||
      reg.individualParticipant?.fullName ||
      reg.user.name;

    const questions = attempt.attemptQuestions.map((aq) => {
      const q = aq.question;
      const ans = answersMap.get(q.id);

      // Reconstruct options strictly using snapshot order without `isCorrect`!
      let orderedOptions: { id: string; content: string }[] = [];
      if (q.type === CBTQuestionType.MULTIPLE_CHOICE && aq.optionOrderJson) {
        try {
          const orderIds: string[] = JSON.parse(aq.optionOrderJson);
          const optionMap = new Map(q.options.map((o) => [o.id, o]));
          orderedOptions = orderIds
            .map((oid) => optionMap.get(oid))
            .filter((o): o is typeof q.options[0] => !!o)
            .map((o) => ({
              id: o.id,
              content: o.content,
            }));
        } catch {
          orderedOptions = q.options.map((o) => ({
            id: o.id,
            content: o.content,
          }));
        }
      }

      return {
        questionOrder: aq.questionOrder,
        questionId: q.id,
        type: q.type,
        question: q.question,
        options: orderedOptions,
        isFlagged: aq.isFlagged,
        currentAnswer: ans
          ? {
              selectedOptionId: ans.selectedOptionId,
              essayAnswer: ans.essayAnswer,
            }
          : null,
      };
    });

    return {
      candidate: {
        name: candidateName,
        registrationNumber: reg.registrationNumber,
        schoolName: attempt.exam.classProgram.major.school.name,
        majorName: attempt.exam.classProgram.major.name,
        classProgramName: attempt.exam.classProgram.name,
      },
      classProgram: {
        id: attempt.exam.classProgram.id,
        name: attempt.exam.classProgram.name,
      },
      exam: {
        title: attempt.exam.title,
        durationMinutes: attempt.exam.durationMinutes,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        remainingSeconds,
      },
      totalQuestions: questions.length,
      questions,
    };
  }

  /**
   * Autosaves candidate answer and ragu-ragu flag.
   */
  async savePesertaAnswer(userId: string, dto: SubmitCbtAnswerDto) {
    const reg = await this.prisma.registration.findFirst({
      where: { userId },
      include: {
        cbtAttempt: {
          include: {
            attemptQuestions: true,
          },
        },
      },
    });

    if (!reg || !reg.cbtAttempt) {
      throw new NotFoundException('Sesi ujian tidak ditemukan.');
    }

    const attempt = reg.cbtAttempt;

    if (attempt.status !== CBTAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Ujian sudah tidak dapat diubah.');
    }

    if (attempt.expiresAt && new Date() >= attempt.expiresAt) {
      await this.autoFinishExpiredAttempt(attempt.id);
      throw new BadRequestException('Waktu ujian Anda telah habis.');
    }

    const question = await this.prisma.cBTQuestion.findUnique({
      where: { id: dto.questionId },
      include: { options: true },
    });

    if (!question) {
      throw new NotFoundException('Soal tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Save / Upsert Answer
      let isCorrect: boolean | null = null;
      let score = new Prisma.Decimal(0);

      if (question.type === CBTQuestionType.MULTIPLE_CHOICE) {
        if (dto.selectedOptionId) {
          const opt = question.options.find((o) => o.id === dto.selectedOptionId);
          if (opt) {
            isCorrect = opt.isCorrect;
            score = opt.isCorrect ? question.score : new Prisma.Decimal(0);
          }
        }
      }

      await tx.cBTAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: attempt.id,
            questionId: dto.questionId,
          },
        },
        create: {
          attemptId: attempt.id,
          questionId: dto.questionId,
          selectedOptionId: dto.selectedOptionId || null,
          essayAnswer: dto.essayAnswer || null,
          isCorrect,
          score,
        },
        update: {
          selectedOptionId: dto.selectedOptionId || null,
          essayAnswer: dto.essayAnswer !== undefined ? dto.essayAnswer : undefined,
          isCorrect,
          score,
        },
      });

      // 2. Update flag if provided
      if (dto.isFlagged !== undefined) {
        await tx.cBTAttemptQuestion.updateMany({
          where: {
            attemptId: attempt.id,
            questionId: dto.questionId,
          },
          data: {
            isFlagged: dto.isFlagged,
          },
        });
      }
    });

    return { success: true, message: 'Jawaban tersimpan.' };
  }

  /**
   * Finalizes the candidate's exam submission.
   */
  async finishPesertaAttempt(userId: string) {
    const reg = await this.prisma.registration.findFirst({
      where: { userId },
      include: {
        studentDetail: true,
        individualParticipant: true,
        user: true,
        cbtAttempt: {
          include: {
            exam: {
              include: {
                questions: true,
                classProgram: {
                  include: { major: { include: { school: true } } },
                },
              },
            },
            answers: {
              include: { question: true },
            },
          },
        },
      },
    });

    if (!reg || !reg.cbtAttempt) {
      throw new NotFoundException('Sesi ujian tidak ditemukan.');
    }

    const attempt = reg.cbtAttempt;

    if (
      attempt.status === CBTAttemptStatus.COMPLETED ||
      attempt.status === CBTAttemptStatus.EXPIRED
    ) {
      return this.formatCandidateCompletionSummary(reg, attempt);
    }

    // Auto calculate Multiple Choice score
    let mcScore = 0;
    for (const ans of attempt.answers) {
      if (
        ans.question.type === CBTQuestionType.MULTIPLE_CHOICE &&
        ans.isCorrect
      ) {
        mcScore += Number(ans.score);
      }
    }

    const hasEssay = attempt.exam.questions.some(
      (q) => q.type === CBTQuestionType.ESSAY,
    );

    const gradingStatus = hasEssay
      ? CBTGradingStatus.NEEDS_ESSAY_GRADING
      : CBTGradingStatus.GRADED;

    const completedAttempt = await this.prisma.cBTAttempt.update({
      where: { id: attempt.id },
      data: {
        status: CBTAttemptStatus.COMPLETED,
        completedAt: new Date(),
        multipleChoiceScore: new Prisma.Decimal(mcScore),
        totalScore: hasEssay
          ? new Prisma.Decimal(mcScore)
          : new Prisma.Decimal(mcScore),
        gradingStatus,
      },
    });

    return this.formatCandidateCompletionSummary(reg, completedAttempt);
  }

  // ==========================================================================
  // 4. HELPER UTILITIES
  // ==========================================================================

  private async autoFinishExpiredAttempt(attemptId: string) {
    const attempt = await this.prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: { include: { questions: true } },
        answers: { include: { question: true } },
      },
    });

    if (!attempt || attempt.status !== CBTAttemptStatus.IN_PROGRESS) return;

    let mcScore = 0;
    for (const ans of attempt.answers) {
      if (
        ans.question.type === CBTQuestionType.MULTIPLE_CHOICE &&
        ans.isCorrect
      ) {
        mcScore += Number(ans.score);
      }
    }

    const hasEssay = attempt.exam.questions.some(
      (q) => q.type === CBTQuestionType.ESSAY,
    );

    await this.prisma.cBTAttempt.update({
      where: { id: attemptId },
      data: {
        status: CBTAttemptStatus.EXPIRED,
        completedAt: attempt.expiresAt || new Date(),
        multipleChoiceScore: new Prisma.Decimal(mcScore),
        totalScore: new Prisma.Decimal(mcScore),
        gradingStatus: hasEssay
          ? CBTGradingStatus.NEEDS_ESSAY_GRADING
          : CBTGradingStatus.GRADED,
      },
    });
  }

  private formatCandidateCompletionSummary(reg: any, attempt: any) {
    const candidateName =
      reg.studentDetail?.fullName ||
      reg.individualParticipant?.fullName ||
      reg.user.name;

    return {
      success: true,
      status: 'COMPLETED',
      candidateName,
      registrationNumber: reg.registrationNumber,
      schoolName: attempt.exam?.classProgram?.major?.school?.name || '',
      majorName: attempt.exam?.classProgram?.major?.name || '',
      classProgramName: attempt.exam?.classProgram?.name || '',
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      message:
        'Ujian telah selesai. Terima kasih telah mengikuti Ujian Online PSB.',
    };
  }

  /**
   * Fisher-Yates array shuffling.
   */
  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
