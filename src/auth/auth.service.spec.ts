import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { HashUtil } from '../common/utils/hash.util';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock_jwt_token'),
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'existing@lomba.id' });

      await expect(
        service.register({
          name: 'Test',
          email: 'existing@lomba.id',
          phoneNumber: '0812345',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create new user and return safe user object', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-uuid',
        name: 'Ahmad Fauzi',
        email: 'ahmad@lomba.id',
        phoneNumber: '0812345678',
        passwordHash: 'hashed_password',
        role: Role.PESERTA,
        isActive: true,
      });

      const res = await service.register({
        name: 'Ahmad Fauzi',
        email: 'ahmad@lomba.id',
        phoneNumber: '0812345678',
        password: 'password123',
      });

      expect(res).toBeDefined();
      expect(res.email).toBe('ahmad@lomba.id');
      expect((res as any).passwordHash).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException on invalid user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'notfound@lomba.id', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'inactive@lomba.id',
        isActive: false,
      });

      await expect(
        service.login({ email: 'inactive@lomba.id', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return accessToken on valid credentials', async () => {
      const hash = await HashUtil.hashPassword('validpass123');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@lomba.id',
        passwordHash: hash,
        role: Role.PESERTA,
        isActive: true,
        sessionVersion: 1,
      });

      const res = await service.login({ email: 'user@lomba.id', password: 'validpass123' });
      expect(res).toBeDefined();
      expect(res.accessToken).toBe('mock_jwt_token');
      expect(res.user.email).toBe('user@lomba.id');
      expect((res.user as any).passwordHash).toBeUndefined();
    });
  });
});
