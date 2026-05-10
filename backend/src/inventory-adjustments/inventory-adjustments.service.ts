import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { AdjustmentType, StockMovementType } from '@prisma/client';

@Injectable()
export class InventoryAdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAdjustmentDto, userId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.adjustmentType === AdjustmentType.REMOVE && product.stock < dto.quantity) {
      throw new BadRequestException(
        `Cannot remove ${dto.quantity} units — only ${product.stock} in stock`,
      );
    }

    const stockDelta =
      dto.adjustmentType === AdjustmentType.ADD ? dto.quantity : -dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: dto.productId },
        data: { stock: { increment: stockDelta } },
      });

      await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          type: StockMovementType.ADJUSTMENT,
          quantity: dto.quantity,
          referenceType: 'Adjustment',
          note: `${dto.adjustmentType} · ${dto.reason}${dto.notes ? ` · ${dto.notes}` : ''}`,
          userId,
        },
      });

      return tx.inventoryAdjustment.create({
        data: {
          productId: dto.productId,
          adjustmentType: dto.adjustmentType,
          reason: dto.reason,
          quantity: dto.quantity,
          notes: dto.notes,
          userId,
        },
        include: {
          product: { select: { id: true, name: true, sku: true, stock: true, unitType: true } },
          user: { select: { id: true, name: true } },
        },
      });
    });
  }

  async findAll(page = 1, limit = 20, productId?: string) {
    const where = productId ? { productId } : {};
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.inventoryAdjustment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true, unitType: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.inventoryAdjustment.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
