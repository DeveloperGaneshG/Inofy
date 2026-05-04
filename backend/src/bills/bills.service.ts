import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillStatusDto } from './dto/update-bill-status.dto';
import { BillStatus } from '@prisma/client';

const TAX_RATE = 0.18;

@Injectable()
export class BillsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateBillNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.bill.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    return `BILL-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(createBillDto: CreateBillDto, userId: string) {
    const { items, customerId, paymentMethod, discountAmount = 0 } = createBillDto;

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
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}`,
        );
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const taxAmount = subtotal * TAX_RATE;
    const totalAmount = subtotal + taxAmount - discountAmount;
    const billNumber = await this.generateBillNumber();

    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data: {
          billNumber,
          customerId: customerId || null,
          userId,
          subtotal,
          taxAmount,
          discountAmount,
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

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      if (customerId) {
        const pointsEarned = Math.floor(totalAmount / 100);
        if (pointsEarned > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          });
        }
      }

      return bill;
    });
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

        for (const item of bill.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
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
