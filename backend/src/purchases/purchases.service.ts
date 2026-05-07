import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { Prisma, PurchaseStatus, StockMovementType } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePurchaseDto, userId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!supplier.isActive) throw new BadRequestException('Supplier is inactive');

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) throw new NotFoundException('One or more products not found');

    const totalAmount = dto.items.reduce((sum, i) => sum + i.costPrice * i.quantity, 0);

    return this.prisma.$transaction(async (tx) => {
      // Generate PO number inside transaction — prevents duplicates under concurrency
      const year = new Date().getFullYear();
      const count = await tx.purchase.count({
        where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
      });
      const purchaseNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;

      return tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId: dto.supplierId,
          userId,
          notes: dto.notes,
          totalAmount,
          items: {
            create: dto.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              costPrice: i.costPrice,
              totalCost: i.costPrice * i.quantity,
              batchNumber: i.batchNumber,
              expiryDate: i.expiryDate ? new Date(i.expiryDate) : null,
            })),
          },
        },
        include: {
          supplier: true,
          items: { include: { product: true } },
          user: { select: { id: true, name: true } },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async receive(id: string, userId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

    if (!purchase) throw new NotFoundException(`Purchase ${id} not found`);
    if (purchase.status !== PurchaseStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT purchases can be received');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        const product = item.product;
        const currentStock = product.stock;
        const currentCostPrice = Number(product.costPrice);
        const newCostPrice = Number(item.costPrice);

        // Weighted average cost price
        const updatedCostPrice =
          currentStock + item.quantity > 0
            ? (currentStock * currentCostPrice + item.quantity * newCostPrice) /
              (currentStock + item.quantity)
            : newCostPrice;

        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: { increment: item.quantity },
            costPrice: Math.round(updatedCostPrice * 100) / 100,
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: StockMovementType.PURCHASE,
            quantity: item.quantity,
            referenceId: purchase.id,
            referenceType: 'Purchase',
            note: `Purchase ${purchase.purchaseNumber}${item.batchNumber ? ` | Batch: ${item.batchNumber}` : ''}`,
            userId,
          },
        });
      }

      return tx.purchase.update({
        where: { id },
        data: { status: PurchaseStatus.RECEIVED, receivedAt: new Date() },
        include: {
          supplier: true,
          items: { include: { product: true } },
          user: { select: { id: true, name: true } },
        },
      });
    });
  }

  async cancel(id: string) {
    const purchase = await this.prisma.purchase.findUnique({ where: { id } });
    if (!purchase) throw new NotFoundException(`Purchase ${id} not found`);
    if (purchase.status !== PurchaseStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT purchases can be cancelled');
    }
    return this.prisma.purchase.update({
      where: { id },
      data: { status: PurchaseStatus.CANCELLED },
    });
  }

  async findAll(page = 1, limit = 10, status?: PurchaseStatus) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : undefined;

    const [purchases, total] = await Promise.all([
      this.prisma.purchase.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          user: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return {
      data: purchases,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: { include: { category: true } } } },
      },
    });
    if (!purchase) throw new NotFoundException(`Purchase ${id} not found`);
    return purchase;
  }

  async getStockMovements(productId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = productId ? { productId } : undefined;

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { id: true, name: true, sku: true } } },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data: movements,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
