import { IsEnum } from 'class-validator';
import { PurchaseStatus } from '../../common/enums';

export class UpdatePurchaseStatusDto {
  @IsEnum(PurchaseStatus)
  status: PurchaseStatus;
}
