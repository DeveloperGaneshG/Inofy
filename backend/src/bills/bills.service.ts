import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillStatusDto } from './dto/update-bill-status.dto';
import { BillStatus, Prisma, StockMovementType } from '@prisma/client';

@Injectable()
export class BillsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBillDto: CreateBillDto, userId: string) {
    const { items, customerId, paymentMethod, discountAmount = 0, redeemPoints = false } = createBillDto;

    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (!product.isActive) {
        throw new BadRequestException(`Product "${product.name}" is not active`);
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const taxAmount = items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const rate = Number(product.gstRate) / 100;
      return sum + item.unitPrice * item.quantity * rate;
    }, 0);
    const baseTotal = subtotal + taxAmount - discountAmount;

    let pointsRedeemed = 0;
    if (redeemPoints && customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
      const available = customer?.loyaltyPoints ?? 0;
      if (available >= 10) {
        const maxRedeem = Math.floor(baseTotal * 0.2);
        pointsRedeemed = Math.min(available, maxRedeem);
      }
    }

    const totalAmount = baseTotal - pointsRedeemed;
    const finalDiscount = discountAmount + pointsRedeemed;

    return this.prisma.$transaction(async (tx) => {
      // Generate bill number inside transaction — prevents duplicates under concurrency
      const year = new Date().getFullYear();
      const count = await tx.bill.count({
        where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
      });
      const billNumber = `BILL-${year}-${String(count + 1).padStart(4, '0')}`;

      const bill = await tx.bill.create({
        data: {
          billNumber,
          customerId: customerId || null,
          userId,
          subtotal,
          taxAmount,
          discountAmount: finalDiscount,
          totalAmount,
          paymentMethod,
          status: BillStatus.PAID,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Atomic decrement — fails if stock < quantity, preventing overselling
      for (const item of items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          const product = products.find((p) => p.id === item.productId)!;
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Stock may have changed — please refresh.`,
          );
        }
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.SALE,
            quantity: item.quantity,
            referenceId: bill.id,
            referenceType: 'Bill',
            note: `Sale ${bill.billNumber}`,
            userId,
          },
        });
      }

      if (customerId) {
        const pointsEarned = Math.floor(totalAmount / 100);
        const netPointChange = pointsEarned - pointsRedeemed;
        await tx.customer.update({
          where: { id: customerId },
          data: { loyaltyPoints: { increment: netPointChange } },
        });
      }

      const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entity: 'Bill',
          entityId: bill.id,
          after: { billNumber: bill.billNumber, totalAmount: Number(bill.totalAmount), paymentMethod },
          userId,
          userName: user?.name,
        },
      });

      return bill;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        skip,
        take: limit,
        include: {
          customer: true,
          user: { select: { id: true, name: true } },
          items: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bill.count(),
    ]);

    return {
      data: bills,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: { include: { category: true } } },
        },
        returns: {
          include: { items: true },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${id} not found`);
    }

    return bill;
  }

  async updateStatus(id: string, dto: UpdateBillStatusDto) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!bill) throw new NotFoundException(`Bill with ID ${id} not found`);
    if (bill.status === BillStatus.CANCELLED) {
      throw new BadRequestException('Bill is already cancelled');
    }

    if (dto.status === BillStatus.CANCELLED) {
      await this.prisma.$transaction(async (tx) => {
        await tx.bill.update({ where: { id }, data: { status: BillStatus.CANCELLED } });
        await tx.auditLog.create({
          data: {
            action: 'CANCEL',
            entity: 'Bill',
            entityId: id,
            before: { status: bill.status },
            after: { status: BillStatus.CANCELLED },
          },
        });

        for (const item of bill.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: StockMovementType.RETURN,
              quantity: item.quantity,
              referenceId: id,
              referenceType: 'Bill',
              note: `Cancelled bill ${bill.id}`,
            },
          });
        }

        if (bill.customerId) {
          const pointsToRemove = Math.floor(Number(bill.totalAmount) / 100);
          if (pointsToRemove > 0) {
            const customer = await tx.customer.findUnique({ where: { id: bill.customerId } });
            await tx.customer.update({
              where: { id: bill.customerId },
              data: { loyaltyPoints: Math.max(0, (customer?.loyaltyPoints ?? 0) - pointsToRemove) },
            });
          }
        }
      });
    } else {
      await this.prisma.bill.update({ where: { id }, data: { status: dto.status } });
    }

    return this.findOne(id);
  }
}
