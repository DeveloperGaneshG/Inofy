import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReturnDto, userId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: dto.billId },
      include: { items: true },
    });

    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status === 'CANCELLED') throw new BadRequestException('Cannot return items from a cancelled bill');

    // Check each return item is valid and not over-returned
    const billItemMap = new Map(bill.items.map((bi) => [bi.id, bi]));

    for (const ri of dto.items) {
      const billItem = billItemMap.get(ri.billItemId);
      if (!billItem) throw new NotFoundException(`Bill item ${ri.billItemId} not found on this bill`);

      const alreadyReturned = await this.prisma.returnItem.aggregate({
        where: { billItemId: ri.billItemId },
        _sum: { quantity: true },
      });
      const returnedQty = alreadyReturned._sum.quantity ?? 0;
      const maxReturnable = billItem.quantity - returnedQty;

      if (ri.quantity > maxReturnable) {
        throw new BadRequestException(
          `Cannot return ${ri.quantity} units — only ${maxReturnable} returnable for that item`,
        );
      }
    }

    const refundAmount = dto.items.reduce((sum, ri) => {
      const billItem = billItemMap.get(ri.billItemId)!;
      return sum + Number(billItem.unitPrice) * ri.quantity;
    }, 0);

    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const count = await tx.return.count({
        where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
      });
      const returnNumber = `RET-${year}-${String(count + 1).padStart(4, '0')}`;

      const ret = await tx.return.create({
        data: {
          returnNumber,
          billId: dto.billId,
          userId,
          type: dto.type,
          reason: dto.reason,
          refundAmount,
          items: {
            create: dto.items.map((ri) => {
              const billItem = billItemMap.get(ri.billItemId)!;
              return {
                billItemId: ri.billItemId,
                productId: billItem.productId,
                quantity: ri.quantity,
                unitPrice: billItem.unitPrice,
                totalPrice: Number(billItem.unitPrice) * ri.quantity,
              };
            }),
          },
        },
        include: {
          items: { include: { product: true, billItem: true } },
          user: { select: { id: true, name: true } },
        },
      });

      // Restock each returned product
      for (const ri of dto.items) {
        const billItem = billItemMap.get(ri.billItemId)!;
        await tx.product.update({
          where: { id: billItem.productId },
          data: { stock: { increment: ri.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: billItem.productId,
            type: StockMovementType.RETURN,
            quantity: ri.quantity,
            referenceId: ret.id,
            referenceType: 'Return',
            note: `Return ${returnNumber} from ${bill.billNumber}`,
            userId,
          },
        });
      }

      return ret;
    });
  }

  async findByBill(billId: string) {
    return this.prisma.return.findMany({
      where: { billId },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const ret = await this.prisma.return.findUnique({
      where: { id },
      include: {
        items: { include: { product: true, billItem: true } },
        user: { select: { id: true, name: true } },
      },
    });
    if (!ret) throw new NotFoundException('Return not found');
    return ret;
  }
}
