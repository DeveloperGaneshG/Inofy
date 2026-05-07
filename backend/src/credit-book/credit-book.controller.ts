import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CreditBookService } from './credit-book.service';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('credit-book')
@UseGuards(JwtAuthGuard)
export class CreditBookController {
  constructor(private readonly creditBookService: CreditBookService) {}

  @Get('summary')
  getSummary() {
    return this.creditBookService.getSummary();
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.creditBookService.findAll(search);
  }

  @Get(':customerId')
  findOne(@Param('customerId') customerId: string) {
    return this.creditBookService.findOne(customerId);
  }

  @Post(':customerId/credit')
  @HttpCode(HttpStatus.CREATED)
  addCredit(@Param('customerId') customerId: string, @Body() dto: AddTransactionDto) {
    return this.creditBookService.addCredit(customerId, dto);
  }

  @Post(':customerId/payment')
  @HttpCode(HttpStatus.CREATED)
  addPayment(@Param('customerId') customerId: string, @Body() dto: AddTransactionDto) {
    return this.creditBookService.addPayment(customerId, dto);
  }
}
