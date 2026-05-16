import { IsEnum } from 'class-validator';
import { BillStatus } from '../../common/enums';

export class UpdateBillStatusDto {
  @IsEnum(BillStatus)
  status: BillStatus;
}
