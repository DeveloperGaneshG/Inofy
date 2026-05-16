import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ExpiryService } from './expiry.service';
import { WriteOffDto } from './expiry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('expiry')
@UseGuards(JwtAuthGuard)
export class ExpiryController {
  constructor(private readonly expiryService: ExpiryService) {}

  @Get('summary')
  getSummary() {
    return this.expiryService.getSummary();
  }

  @Get('batches')
  getBatches(
    @Query('filter') filter?: string,
    @Query('search') search?: string,
  ) {
    return this.expiryService.getBatches(filter, search);
  }

  @Post('write-off')
  writeOff(@Body() dto: WriteOffDto, @CurrentUser() user: any) {
    return this.expiryService.writeOff(dto, user.id);
  }

  @Get('write-off-log')
  getWriteOffLog(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.expiryService.getWriteOffLog(from, to);
  }

  @Get('alerts')
  getExpiryAlerts() {
    return this.expiryService.getExpiryAlerts();
  }
}
