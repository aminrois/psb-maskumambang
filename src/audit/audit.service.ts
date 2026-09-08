import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogDto {
  userId?: string;
  action: string;
  targetTable: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(dto: AuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: dto.userId,
          action: dto.action,
          targetTable: dto.targetTable,
          targetId: dto.targetId,
          details: dto.details,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });
    } catch (err) {
      // Non-blocking log failure
      console.error('Failed to write audit log:', err);
    }
  }

  async listLogs(search?: string, action?: string, page = 1, perPage = 25) {
    const skip = (page - 1) * perPage;
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { targetTable: { contains: q, mode: 'insensitive' } },
        { details: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }
}
