import { IsEnum } from 'class-validator';
import { BillStatus } from '@prisma/client';

export class UpdateBillStatusDto {
  @IsEnum(BillStatus)
  status: BillStatus;
}
