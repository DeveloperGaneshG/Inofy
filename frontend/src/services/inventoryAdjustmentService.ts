import { api } from '@/lib/axios';
import { ApiResponse, InventoryAdjustment, AdjustmentType, AdjustmentReason, PaginatedData } from '@/types';

export interface CreateAdjustmentPayload {
  productId: string;
  adjustmentType: AdjustmentType;
  reason: AdjustmentReason;
  quantity: number;
  notes?: string;
}

export const inventoryAdjustmentService = {
  create: (payload: CreateAdjustmentPayload) =>
    api.post<ApiResponse<InventoryAdjustment>>('/inventory-adjustments', payload),

  getAll: (page = 1, limit = 20, productId?: string) =>
    api.get<ApiResponse<PaginatedData<InventoryAdjustment>>>('/inventory-adjustments', {
      params: { page, limit, ...(productId ? { productId } : {}) },
    }),
};
