import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExpiryController } from './expiry.controller';
import { ExpiryService } from './expiry.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExpiryController],
  providers: [ExpiryService],
})
export class ExpiryModule {}
