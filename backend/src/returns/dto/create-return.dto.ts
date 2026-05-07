import { IsUUID, IsEnum, IsOptional, IsString, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnType } from '@prisma/client';

export class ReturnItemDto {
  @IsUUID()
  billItemId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateReturnDto {
  @IsUUID()
  billId: string;

  @IsEnum(ReturnType)
  type: ReturnType;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
