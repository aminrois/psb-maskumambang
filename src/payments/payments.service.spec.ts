import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentStatus, RegistrationStatus, Role, VerificationAction } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  const mockPrisma = {
    paymentAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    registration: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    paymentVerificationLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfig = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'upload.folder') return 'uploads';
      return null;
    }),
  };

  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('uploadPayment', () => {
    it('PAY-01 & PAY-02: should upload valid payment proof and set status to WAITING_VERIFICATION', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue({
        id: 'reg-1',
        userId: 'user-1',
        registrationNumber: 'REG-IND-2026-ABC123',
        branch: { registrationFee: 150000 },
      });

      mockPrisma.paymentAccount.findUnique.mockResolvedValue({
        id: 'acc-1',
        bankName: 'BSI',
        isActive: true,
      });

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          payment: {
            create: jest.fn().mockResolvedValue({
              id: 'pay-1',
              amount: 150000,
              status: PaymentStatus.WAITING_VERIFICATION,
            }),
          },
          registration: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const res = await service.uploadPayment(
        'user-1',
        {
          registrationId: 'reg-1',
          paymentAccountId: 'acc-1',
          paymentDate: '2026-08-27',
          senderBank: 'BSI',
          senderAccountName: 'Ahmad',
        },
        validPngBuffer,
        'bukti.png',
      );

      expect(res).toBeDefined();
      expect(res.amount).toBe(150000);
      expect(res.status).toBe(PaymentStatus.WAITING_VERIFICATION);
    });

    it('PAY-SEC-02: should reject upload if user is not the owner (IDOR check)', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue({
        id: 'reg-1',
        userId: 'user-other', // Belongs to user-other
      });

      await expect(
        service.uploadPayment(
          'user-attacker',
          {
            registrationId: 'reg-1',
            paymentAccountId: 'acc-1',
            paymentDate: '2026-08-27',
          },
          validPngBuffer,
          'bukti.png',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approvePayment', () => {
    it('PAY-04 & PAY-05: Bendahara can approve payment atomically', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        registrationId: 'reg-1',
        registration: { registrationNumber: 'REG-IND-2026-ABC123' },
      });

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          payment: {
            update: jest.fn().mockResolvedValue({ id: 'pay-1', status: PaymentStatus.APPROVED }),
          },
          registration: {
            update: jest.fn().mockResolvedValue({ id: 'reg-1', status: RegistrationStatus.APPROVED }),
          },
          paymentVerificationLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const res = await service.approvePayment('pay-1', 'bendahara-uuid');
      expect(res).toBeDefined();
      expect(res.status).toBe(PaymentStatus.APPROVED);
    });
  });

  describe('rejectPayment', () => {
    it('PAY-08 & PAY-09: Bendahara must provide rejection reason when rejecting payment', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        registrationId: 'reg-1',
        registration: { registrationNumber: 'REG-IND-2026-ABC123' },
      });

      // Blank reason must throw BadRequestException
      await expect(
        service.rejectPayment('pay-1', 'bendahara-uuid', { rejectionReason: '' }),
      ).rejects.toThrow(BadRequestException);

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          payment: {
            update: jest.fn().mockResolvedValue({ id: 'pay-1', status: PaymentStatus.REJECTED }),
          },
          registration: {
            update: jest.fn().mockResolvedValue({ id: 'reg-1', status: RegistrationStatus.PAYMENT_REJECTED }),
          },
          paymentVerificationLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const res = await service.rejectPayment('pay-1', 'bendahara-uuid', {
        rejectionReason: 'Nominal transfer kurang Rp 50.000',
      });
      expect(res.status).toBe(PaymentStatus.REJECTED);
    });
  });
});
