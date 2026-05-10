import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    action: string;
    entity: string;
    entityId?: string;
    before?: object;
    after?: object;
    userId?: string;
    userName?: string;
  }) {
    return this.prisma.auditLog.create({ data: params });
  }

  async findAll(page = 1, limit = 50, entity?: string, userId?: string) {
    const where: any = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
