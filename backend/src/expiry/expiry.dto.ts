import { IsString, IsInt, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class WriteOffDto {
  @IsString()
  @IsNotEmpty()
  purchaseItemId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantityWrittenOff: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
