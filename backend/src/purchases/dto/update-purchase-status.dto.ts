import { IsEnum } from 'class-validator';
import { PurchaseStatus } from '@prisma/client';

export class UpdatePurchaseStatusDto {
  @IsEnum(PurchaseStatus)
  status: PurchaseStatus;
}
