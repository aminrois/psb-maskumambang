import { Test, TestingModule } from '@nestjs/testing';
import { CompetitionsService } from './competitions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ParticipantType } from '@prisma/client';

describe('CompetitionsService', () => {
  let service: CompetitionsService;
  let prisma: PrismaService;

  const mockPrisma = {
    competitionCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    competitionLevel: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    competitionBranch: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CompetitionsService>(CompetitionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('COMP-01: should return competition tree with categories, levels, and branches', async () => {
    mockPrisma.competitionCategory.findMany.mockResolvedValue([
      {
        id: 'cat-1',
        name: 'Robotik',
        levels: [
          {
            id: 'lvl-1',
            name: 'SMP',
            branches: [
              { id: 'br-1', name: 'Soccer', participantType: ParticipantType.TEAM },
            ],
          },
        ],
      },
    ]);

    const tree = await service.getTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('Robotik');
    expect(tree[0].levels[0].branches[0].name).toBe('Soccer');
  });

  it('COMP-04: should return branch detail', async () => {
    mockPrisma.competitionBranch.findUnique.mockResolvedValue({
      id: 'br-1',
      name: 'Creative Robot',
      participantType: ParticipantType.TEAM,
      minTeamMembers: 2,
      maxTeamMembers: 4,
      isActive: true,
      level: {
        id: 'lvl-1',
        name: 'SMA',
        category: { id: 'cat-1', name: 'Robotik' },
      },
    });

    const branch = await service.getBranchDetail('br-1');
    expect(branch).toBeDefined();
    expect(branch.name).toBe('Creative Robot');
    expect(branch.participantType).toBe(ParticipantType.TEAM);
  });

  it('COMP-05: validateHierarchy should reject inactive branch', async () => {
    mockPrisma.competitionBranch.findUnique.mockResolvedValue({
      id: 'br-inactive',
      name: 'Inactive Branch',
      isActive: false,
      levelId: 'lvl-1',
      level: { categoryId: 'cat-1' },
    });

    await expect(service.validateHierarchy('cat-1', 'lvl-1', 'br-inactive')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('COMP-06: validateHierarchy should reject mismatched level and branch', async () => {
    mockPrisma.competitionBranch.findUnique.mockResolvedValue({
      id: 'br-1',
      name: 'Soccer',
      isActive: true,
      levelId: 'lvl-2', // Actual level is lvl-2
      level: { categoryId: 'cat-1' },
    });

    await expect(service.validateHierarchy('cat-1', 'lvl-1', 'br-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
