import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '@prisma/client';

describe('UsersService Multi-Role', () => {
  let service: UsersService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    audit = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should assign multiple roles when creating a user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }: any) => {
      return {
        id: 'user-123',
        ...data,
      };
    });

    const result = await service.createUser('staff-1', {
      name: 'Ustadz Ahmad',
      email: 'ahmad@example.com',
      phoneNumber: '08123456789',
      password: 'password123',
      roles: [Role.PEWAWANCARA, Role.PETUGAS_TES_PRAKTIK],
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Ustadz Ahmad',
        email: 'ahmad@example.com',
        role: Role.PEWAWANCARA,
        roles: [Role.PEWAWANCARA, Role.PETUGAS_TES_PRAKTIK],
      }),
    });
    expect(result.role).toBe(Role.PEWAWANCARA);
    expect(result.roles).toEqual([Role.PEWAWANCARA, Role.PETUGAS_TES_PRAKTIK]);
  });

  it('should change user roles to multiple roles', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'ahmad@example.com',
      role: Role.PESERTA,
      roles: [Role.PESERTA],
    });

    prisma.user.update.mockImplementation(({ data }: any) => ({
      id: 'user-123',
      email: 'ahmad@example.com',
      role: data.role,
      roles: data.roles,
    }));

    const result = await service.changeRole(
      'user-123',
      undefined,
      [Role.PEWAWANCARA, Role.PETUGAS_TES_PRAKTIK],
      'staff-1',
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: expect.objectContaining({
        role: Role.PEWAWANCARA,
        roles: [Role.PEWAWANCARA, Role.PETUGAS_TES_PRAKTIK],
      }),
    });
    expect(result.roles).toEqual([Role.PEWAWANCARA, Role.PETUGAS_TES_PRAKTIK]);
  });
});

