import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales/daily')
  getDailySales(@Query('date') date: string) {
    const target = date || new Date().toISOString().split('T')[0];
    return this.reportsService.getDailySales(target);
  }

  @Get('sales/monthly')
  getMonthlySales(@Query('month') month: string, @Query('year') year: string) {
    const now = new Date();
    return this.reportsService.getMonthlySales(
      +(month || now.getMonth() + 1),
      +(year || now.getFullYear()),
    );
  }

  @Get('top-products')
  getTopProducts(@Query('limit') limit = 10) {
    return this.reportsService.getTopProducts(+limit);
  }

  @Get('revenue')
  getRevenue(@Query('from') from: string, @Query('to') to: string) {
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultTo = now.toISOString().split('T')[0];
    return this.reportsService.getRevenue(from || defaultFrom, to || defaultTo);
  }

  @Get('inventory')
  getInventory() {
    return this.reportsService.getInventory();
  }
}
