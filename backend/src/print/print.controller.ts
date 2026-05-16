import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PrintService } from './print.service';
import type { PrintBillDto } from './print.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('print')
export class PrintController {
  constructor(private readonly printService: PrintService) {}

  @Post('receipt')
  printReceipt(@Body() dto: PrintBillDto) {
    return this.printService.print(dto);
  }

  @Post('test')
  printTest() {
    return this.printService.printTest();
  }
}
