import { Module } from '@nestjs/common';
import { CreditBookController } from './credit-book.controller';
import { CreditBookService } from './credit-book.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CreditBookController],
  providers: [CreditBookService],
})
export class CreditBookModule {}
