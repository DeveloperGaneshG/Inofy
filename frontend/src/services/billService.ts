import { api } from '@/lib/axios';
import { ApiResponse, Bill, BillStatus, PaymentMethod, PaginatedData } from '@/types';

export interface CreateBillPayload {
  customerId?: string;
  paymentMethod: PaymentMethod;
  discountAmount?: number;
  items: { productId: string; quantity: number; unitPrice: number }[];
}

export const billService = {
  getAll: (page = 1, limit = 10) =>
    api.get<ApiResponse<PaginatedData<Bill>>>(`/bills?page=${page}&limit=${limit}`),
  getById: (id: string) => api.get<ApiResponse<Bill>>(`/bills/${id}`),
  create: (data: CreateBillPayload) => api.post<ApiResponse<Bill>>('/bills', data),
  updateStatus: (id: string, status: BillStatus) =>
    api.patch<ApiResponse<Bill>>(`/bills/${id}/status`, { status }),
};
