import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PurchaseStatus, Role } from '../common/enums';

@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.CASHIER)
  create(@Body() dto: CreatePurchaseDto, @CurrentUser() user: any) {
    return this.purchasesService.create(dto, user.id);
  }

  @Post(':id/receive')
  @Roles(Role.ADMIN, Role.CASHIER)
  receive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.purchasesService.receive(id, user.id);
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN)
  cancel(@Param('id') id: string) {
    return this.purchasesService.cancel(id);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: PurchaseStatus,
  ) {
    return this.purchasesService.findAll(page, limit, status);
  }

  @Get('stock-movements')
  getStockMovements(
    @Query('productId') productId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.purchasesService.getStockMovements(productId, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }
}
