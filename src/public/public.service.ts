import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PublicParticipantSearchResult {
  registration_number: string;
  participant_name: string;
  school_name: string;
  branch_name: string;
  level_name: string;
  category_name: string;
  status: string;
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Searches participants publicly by name, team name, registration number, or school name.
   * Strictly filtered to 7 public non-sensitive fields.
   */
  async searchParticipants(query?: string): Promise<PublicParticipantSearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const cleaned = query.trim();

    const registrations = await this.prisma.registration.findMany({
      where: {
        OR: [
          { registrationNumber: { contains: cleaned, mode: 'insensitive' } },
          {
            individualParticipant: {
              OR: [
                { fullName: { contains: cleaned, mode: 'insensitive' } },
                { schoolName: { contains: cleaned, mode: 'insensitive' } },
              ],
            },
          },
          {
            team: {
              OR: [
                { teamName: { contains: cleaned, mode: 'insensitive' } },
                { schoolName: { contains: cleaned, mode: 'insensitive' } },
              ],
            },
          },
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
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    return registrations.map((r) => {
      const participantName =
        r.individualParticipant?.fullName || r.team?.teamName || 'Calon Siswa';
      const schoolName =
        r.individualParticipant?.schoolName || r.team?.schoolName || '-';

      const school = r.classProgram?.major?.school;
      const major = r.classProgram?.major;
      const cp = r.classProgram;

      return {
        registration_number: r.registrationNumber,
        participant_name: participantName,
        school_name: schoolName,
        target_school_name: school?.name || '-',
        target_major_name: major?.name || '-',
        target_class_program_name: cp?.name || '-',
        branch_name: cp?.name || '-',
        level_name: major?.name || '-',
        category_name: school?.name || '-',
        status: r.status,
      };
    });
  }
}

