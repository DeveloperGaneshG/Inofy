import { api } from '@/lib/axios';
import { ApiResponse, Purchase, PurchaseStatus, StockMovement, PaginatedData } from '@/types';

export interface PurchaseItemPayload {
  productId: string;
  quantity: number;
  costPrice: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface CreatePurchasePayload {
  supplierId: string;
  notes?: string;
  items: PurchaseItemPayload[];
}

export const purchaseService = {
  getAll: (page = 1, limit = 10, status?: PurchaseStatus) =>
    api.get<ApiResponse<PaginatedData<Purchase>>>('/purchases', {
      params: { page, limit, ...(status ? { status } : {}) },
    }),

  getOne: (id: string) => api.get<ApiResponse<Purchase>>(`/purchases/${id}`),

  create: (payload: CreatePurchasePayload) =>
    api.post<ApiResponse<Purchase>>('/purchases', payload),

  receive: (id: string) => api.post<ApiResponse<Purchase>>(`/purchases/${id}/receive`),

  cancel: (id: string) => api.post<ApiResponse<Purchase>>(`/purchases/${id}/cancel`),

  getStockMovements: (productId?: string, page = 1, limit = 20) =>
    api.get<ApiResponse<PaginatedData<StockMovement>>>('/purchases/stock-movements', {
      params: { page, limit, ...(productId ? { productId } : {}) },
    }),
};
