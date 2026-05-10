import { IsString, IsOptional, IsEnum, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { AdjustmentType, AdjustmentReason } from '@prisma/client';

export class CreateAdjustmentDto {
  @IsUUID()
  productId: string;

  @IsEnum(AdjustmentType)
  adjustmentType: AdjustmentType;

  @IsEnum(AdjustmentReason)
  reason: AdjustmentReason;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
