import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WriteOffDto } from './expiry.dto';
import { PurchaseStatus } from '../common/enums';

@Injectable()
export class ExpiryService {
  constructor(private readonly prisma: PrismaService) {}

  private getDateBoundaries() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Use exclusive upper bounds so full calendar days are included
    const afterWeek = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000);
    const afterMonth = new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000);
    return { today, afterWeek, afterMonth };
  }

  async getSummary() {
    const { today, afterWeek, afterMonth } = this.getDateBoundaries();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const baseWhere = { purchase: { status: PurchaseStatus.RECEIVED }, quantity: { gt: 0 } };

    const [expiredItems, weekItems, thisMonthCount, safeCount, writeOffItems] = await Promise.all([
      this.prisma.purchaseItem.findMany({
        where: { ...baseWhere, expiryDate: { lt: today } },
        select: { quantity: true, costPrice: true },
      }),
      this.prisma.purchaseItem.findMany({
        where: { ...baseWhere, expiryDate: { gte: today, lt: afterWeek } },
        select: { quantity: true, costPrice: true },
      }),
      this.prisma.purchaseItem.count({
        where: { ...baseWhere, expiryDate: { gte: afterWeek, lt: afterMonth } },
      }),
      this.prisma.purchaseItem.count({
        where: { ...baseWhere, expiryDate: { gte: afterMonth } },
      }),
      this.prisma.stockWriteOff.findMany({
        where: { createdAt: { gte: startOfMonth } },
        select: {
          quantityWrittenOff: true,
          purchaseItem: { select: { costPrice: true } },
        },
      }),
    ]);

    const stockValueAtRisk = [...expiredItems, ...weekItems].reduce(
      (sum, item) => sum + item.quantity * Number(item.costPrice),
      0,
    );

    const writeOffThisMonth = writeOffItems.reduce(
      (acc, w) => ({
        quantity: acc.quantity + w.quantityWrittenOff,
        value: acc.value + w.quantityWrittenOff * Number(w.purchaseItem.costPrice),
      }),
      { quantity: 0, value: 0 },
    );

    return {
      expired: expiredItems.length,
      thisWeek: weekItems.length,
      thisMonth: thisMonthCount,
      safe: safeCount,
      stockValueAtRisk: Math.round(stockValueAtRisk * 100) / 100,
      writeOffThisMonth: {
        quantity: writeOffThisMonth.quantity,
        value: Math.round(writeOffThisMonth.value * 100) / 100,
      },
    };
  }

  async getBatches(filter = 'all', search?: string) {
    const { today, afterWeek, afterMonth } = this.getDateBoundaries();

    const expiryFilter: Record<string, object> = {
      expired: { lt: today },
      week: { gte: today, lt: afterWeek },
      month: { gte: afterWeek, lt: afterMonth },
      safe: { gte: afterMonth },
      all: { not: null },
    };

    const where: Record<string, unknown> = {
      purchase: { status: PurchaseStatus.RECEIVED },
      quantity: { gt: 0 },
      expiryDate: expiryFilter[filter] ?? { not: null },
    };

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const items = await this.prisma.purchaseItem.findMany({
      where: where as any,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        purchase: {
          include: { supplier: { select: { id: true, name: true } } },
        },
      },
    });

    return items
      .map((item) => {
        const daysLeft = Math.floor(
          (item.expiryDate!.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
        );
        let status: string;
        if (daysLeft < 0) status = 'expired';
        else if (daysLeft === 0) status = 'today';
        else if (daysLeft <= 7) status = 'week';
        else if (daysLeft <= 30) status = 'month';
        else status = 'safe';

        return {
          purchaseItemId: item.id,
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          daysLeft,
          quantity: item.quantity,
          costPrice: Number(item.costPrice),
          supplierId: item.purchase.supplierId,
          supplierName: item.purchase.supplier.name,
          status,
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  async writeOff(dto: WriteOffDto, userId: string) {
    const purchaseItem = await this.prisma.purchaseItem.findUnique({
      where: { id: dto.purchaseItemId },
      include: { purchase: true },
    });

    if (!purchaseItem) throw new NotFoundException('Purchase item not found');
    if (purchaseItem.purchase.status !== PurchaseStatus.RECEIVED) {
      throw new BadRequestException('Write-off only allowed for RECEIVED purchases');
    }
    if (dto.quantityWrittenOff > purchaseItem.quantity) {
      throw new BadRequestException(
        `Cannot write off ${dto.quantityWrittenOff} — only ${purchaseItem.quantity} available`,
      );
    }

    const writeOff = await this.prisma.$transaction(async (tx) => {
      const record = await tx.stockWriteOff.create({
        data: {
          purchaseItemId: dto.purchaseItemId,
          productId: purchaseItem.productId,
          quantityWrittenOff: dto.quantityWrittenOff,
          reason: dto.reason,
          writtenOffBy: userId,
        },
      });

      await tx.product.update({
        where: { id: purchaseItem.productId },
        data: { stock: { decrement: dto.quantityWrittenOff } },
      });

      await tx.purchaseItem.update({
        where: { id: dto.purchaseItemId },
        data: { quantity: { decrement: dto.quantityWrittenOff } },
      });

      return record;
    });

    return { writeOffId: writeOff.id, message: 'Stock written off successfully' };
  }

  async getWriteOffLog(from?: string, to?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const fromDate = from ? new Date(from) : startOfMonth;
    const toDate = to ? new Date(to) : new Date();

    const items = await this.prisma.stockWriteOff.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, name: true, email: true } },
        purchaseItem: { select: { costPrice: true, batchNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalQuantity = items.reduce((sum, w) => sum + w.quantityWrittenOff, 0);
    const totalValue = items.reduce(
      (sum, w) => sum + w.quantityWrittenOff * Number(w.purchaseItem.costPrice),
      0,
    );

    return {
      items,
      totalQuantity,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  }

  async getExpiryAlerts() {
    const { today, afterWeek } = this.getDateBoundaries();
    const baseWhere = { purchase: { status: PurchaseStatus.RECEIVED }, quantity: { gt: 0 } };

    const [expired, thisWeek] = await Promise.all([
      this.prisma.purchaseItem.count({ where: { ...baseWhere, expiryDate: { lt: today } } }),
      this.prisma.purchaseItem.count({
        where: { ...baseWhere, expiryDate: { gte: today, lt: afterWeek } },
      }),
    ]);

    return { expired, thisWeek, total: expired + thisWeek };
  }
}
