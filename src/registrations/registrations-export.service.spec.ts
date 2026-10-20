import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationsExportService } from './registrations-export.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';

describe('RegistrationsExportService', () => {
  let service: RegistrationsExportService;

  const mockPrismaService = {
    registration: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    school: { findMany: jest.fn() },
    admissionWave: { findMany: jest.fn() },
    academicPeriod: { findMany: jest.fn() },
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('uploads'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsExportService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RegistrationsExportService>(RegistrationsExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFilePrefix', () => {
    it('should format prefix strictly as NAMA_Nomorpendaftaran', () => {
      const mockReg = {
        registrationNumber: 'PSB-MI-27-0012A',
        studentDetail: {
          fullName: 'Ahmad Fauzi Rahman',
        },
      };

      const prefix = service.getFilePrefix(mockReg);
      expect(prefix).toBe('AHMAD_FAUZI_RAHMAN_PSB-MI-27-0012A');
    });

    it('should fallback to user name if studentDetail is missing', () => {
      const mockReg = {
        registrationNumber: 'PSB-MA-27-0045B',
        user: {
          name: 'Siti Nurhaliza',
        },
      };

      const prefix = service.getFilePrefix(mockReg);
      expect(prefix).toBe('SITI_NURHALIZA_PSB-MA-27-0045B');
    });
  });

  describe('generateStudentBiodataPdf', () => {
    it('should generate a valid PDF buffer starting with %PDF', async () => {
      const mockReg = {
        id: 'reg-123',
        registrationNumber: 'PSB-MTS-27-0001',
        boardingStatus: 'MUKIM',
        formStatus: 'VERIFIED',
        finalStatus: 'LULUS',
        qrCodeToken: 'token-abc',
        classProgram: {
          name: 'Reguler',
          major: {
            name: 'Madrasah Tsanawiyah',
            school: { name: 'MTs Maskumambang', initial: 'MTs' },
          },
        },
        admissionWave: { name: 'Gelombang 1' },
        academicPeriod: { name: '2026/2027' },
        studentDetail: {
          fullName: 'Muhammad Ali',
          gender: 'L',
          nik: '3525010101010001',
          nisn: '0012345678',
          birthPlace: 'Gresik',
          birthDate: new Date('2012-05-15'),
          fullAddress: 'Jl. KH. Syafi\'i No. 12',
          cityDistrict: 'Gresik',
          previousSchoolName: 'MI Maskumambang',
        },
        documents: [],
        payments: [],
      };

      const pdfBuffer = await service.generateStudentBiodataPdf(mockReg);
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(100);
      // PDF file magic header is %PDF
      expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('generateStudentBiodataExcel', () => {
    it('should generate a valid Excel (.xlsx) buffer starting with PK zip magic', async () => {
      const mockReg = {
        id: 'reg-456',
        registrationNumber: 'PSB-SMK-27-0089',
        boardingStatus: 'NON_MUKIM',
        formStatus: 'SUBMITTED',
        finalStatus: 'UNDECIDED',
        classProgram: {
          name: 'Teknik Komputer & Jaringan',
          major: {
            name: 'SMK',
            school: { name: 'SMK Maskumambang', initial: 'SMK' },
          },
        },
        admissionWave: { name: 'Gelombang 2' },
        academicPeriod: { name: '2026/2027' },
        studentDetail: {
          fullName: 'Budi Santoso',
          gender: 'L',
          nik: '3525010101010002',
          nisn: '0087654321',
        },
        documents: [],
        payments: [],
      };

      const excelBuffer = await service.generateStudentBiodataExcel(mockReg);
      expect(Buffer.isBuffer(excelBuffer)).toBe(true);
      expect(excelBuffer.length).toBeGreaterThan(100);
      // XLSX is a ZIP archive, starts with 'PK' (0x50 0x4B)
      expect(excelBuffer.subarray(0, 2).toString()).toBe('PK');
    });
  });

  describe('buildStudentZipBuffer', () => {
    it('should create an individual ZIP with naming [NAMA_Nomorpendaftaran].zip', async () => {
      const mockReg = {
        id: 'reg-789',
        registrationNumber: 'PSB-MI-27-0099',
        classProgram: {
          name: 'Tahfidh',
          major: {
            school: { name: 'MI Maskumambang', initial: 'MI' },
          },
        },
        studentDetail: {
          fullName: 'Fathimah Azzahra',
        },
        documents: [],
        payments: [],
      };

      const result = await service.buildStudentZipBuffer(mockReg);
      expect(result.filename).toBe('FATHIMAH_AZZAHRA_PSB-MI-27-0099.zip');
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(100);
      // ZIP starts with PK
      expect(result.buffer.subarray(0, 2).toString()).toBe('PK');
    });
  });
});
