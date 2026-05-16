import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { CreditTransactionType } from '../common/enums';

@Injectable()
export class CreditBookService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const transactions = await this.prisma.creditTransaction.findMany({
      select: { type: true, amount: true, customerId: true },
    });

    const balanceMap = new Map<string, number>();
    for (const t of transactions) {
      const prev = balanceMap.get(t.customerId) ?? 0;
      balanceMap.set(
        t.customerId,
        t.type === 'CREDIT' ? prev + Number(t.amount) : prev - Number(t.amount),
      );
    }

    const balances = [...balanceMap.values()];
    const totalOutstanding = balances.filter((b) => b > 0).reduce((a, b) => a + b, 0);
    const debtorCount = balances.filter((b) => b > 0).length;
    const clearedCount = balances.filter((b) => b <= 0).length;

    return { totalOutstanding, debtorCount, clearedCount };
  }

  async findAll(search?: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        creditTransactions: { some: {} },
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        creditTransactions: { select: { type: true, amount: true, createdAt: true } },
      },
      orderBy: { name: 'asc' },
    });

    return customers
      .map((c) => {
        const balance = c.creditTransactions.reduce(
          (acc, t) => (t.type === 'CREDIT' ? acc + Number(t.amount) : acc - Number(t.amount)),
          0,
        );
        const lastActivity =
          c.creditTransactions.length > 0
            ? c.creditTransactions.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              )[0].createdAt
            : null;
        const { creditTransactions, ...rest } = c;
        return { ...rest, creditBalance: balance, lastActivity };
      })
      .sort((a, b) => b.creditBalance - a.creditBalance);
  }

  async findOne(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        creditTransactions: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    let running = 0;
    const transactionsWithRunning = customer.creditTransactions.map((t) => {
      running += t.type === 'CREDIT' ? Number(t.amount) : -Number(t.amount);
      return { ...t, runningBalance: running };
    });

    return {
      ...customer,
      creditTransactions: transactionsWithRunning.reverse(),
      creditBalance: running,
    };
  }

  async addCredit(customerId: string, dto: AddTransactionDto) {
    return this.addTransaction(customerId, CreditTransactionType.CREDIT, dto);
  }

  async addPayment(customerId: string, dto: AddTransactionDto) {
    const current = await this.getBalance(customerId);
    if (dto.amount > current) {
      throw new BadRequestException(
        `Payment ₹${dto.amount} exceeds outstanding balance ₹${current.toFixed(2)}`,
      );
    }
    return this.addTransaction(customerId, CreditTransactionType.PAYMENT, dto);
  }

  private async getBalance(customerId: string): Promise<number> {
    const transactions = await this.prisma.creditTransaction.findMany({
      where: { customerId },
      select: { type: true, amount: true },
    });
    return transactions.reduce(
      (acc, t) => (t.type === 'CREDIT' ? acc + Number(t.amount) : acc - Number(t.amount)),
      0,
    );
  }

  private async addTransaction(
    customerId: string,
    type: CreditTransactionType,
    dto: AddTransactionDto,
  ) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.creditTransaction.create({
      data: { customerId, type, amount: dto.amount, description: dto.description, note: dto.note },
    });
  }
}
