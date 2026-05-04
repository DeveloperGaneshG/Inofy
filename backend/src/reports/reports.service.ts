import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDailySales(date: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bills = await this.prisma.bill.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay }, status: BillStatus.PAID },
      include: { items: true },
    });

    return {
      date,
      totalSales: bills.reduce((sum, b) => sum + Number(b.totalAmount), 0),
      totalOrders: bills.length,
      totalItems: bills.reduce((s, b) => s + b.items.reduce((is, i) => is + i.quantity, 0), 0),
      bills,
    };
  }

  async getMonthlySales(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const bills = await this.prisma.bill.findMany({
      where: { createdAt: { gte: startDate, lte: endDate }, status: BillStatus.PAID },
    });

    const dailyBreakdown = bills.reduce<Record<string, { date: string; revenue: number; orders: number }>>(
      (acc, bill) => {
        const day = bill.createdAt.toISOString().split('T')[0];
        if (!acc[day]) acc[day] = { date: day, revenue: 0, orders: 0 };
        acc[day].revenue += Number(bill.totalAmount);
        acc[day].orders += 1;
        return acc;
      },
      {},
    );

    return {
      month,
      year,
      totalRevenue: bills.reduce((sum, b) => sum + Number(b.totalAmount), 0),
      totalOrders: bills.length,
      dailyBreakdown: Object.values(dailyBreakdown).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getTopProducts(limit = 10) {
    const result = await this.prisma.billItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPrice: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = result.map((r) => r.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true },
    });

    return result.map((r) => ({
      product: products.find((p) => p.id === r.productId),
      totalQuantitySold: r._sum.quantity ?? 0,
      totalRevenue: Number(r._sum.totalPrice ?? 0),
      totalOrders: r._count.id,
    }));
  }

  async getRevenue(from: string, to: string) {
    const startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    const bills = await this.prisma.bill.findMany({
      where: { createdAt: { gte: startDate, lte: endDate }, status: BillStatus.PAID },
    });

    const dailyRevenue = bills.reduce<Record<string, number>>((acc, bill) => {
      const day = bill.createdAt.toISOString().split('T')[0];
      acc[day] = (acc[day] ?? 0) + Number(bill.totalAmount);
      return acc;
    }, {});

    return {
      from,
      to,
      totalRevenue: bills.reduce((sum, b) => sum + Number(b.totalAmount), 0),
      totalTax: bills.reduce((sum, b) => sum + Number(b.taxAmount), 0),
      totalDiscount: bills.reduce((sum, b) => sum + Number(b.discountAmount), 0),
      totalSubtotal: bills.reduce((sum, b) => sum + Number(b.subtotal), 0),
      totalOrders: bills.length,
      dailyRevenue: Object.entries(dailyRevenue)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getInventory() {
    const products = await this.prisma.product.findMany({
      include: { category: true },
      orderBy: { stock: 'asc' },
    });

    const lowStockProducts = products.filter((p) => p.stock < p.lowStockAlert);
    const outOfStockProducts = products.filter((p) => p.stock === 0);

    return {
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      totalStockValue: products.reduce((sum, p) => sum + Number(p.costPrice) * p.stock, 0),
      products,
      lowStockProducts,
      outOfStockProducts,
    };
  }
}
