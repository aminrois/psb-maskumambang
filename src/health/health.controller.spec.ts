import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status without exposing sensitive credentials', async () => {
    const res = await controller.getHealth();
    expect(res).toBeDefined();
    expect(res.status).toBe('ok');
    expect(res.database).toBe('connected');
    expect(res).not.toHaveProperty('databaseUrl');
    expect(res).not.toHaveProperty('password');
    expect(res).not.toHaveProperty('secret');
  });
});
