import { api } from '@/lib/axios';
import { ApiResponse, CreditCustomer, CreditCustomerDetail, CreditSummary, CreditTransaction } from '@/types';

export interface TransactionPayload {
  amount: number;
  description?: string;
  note?: string;
}

export const creditBookService = {
  getSummary: () => api.get<ApiResponse<CreditSummary>>('/credit-book/summary'),

  getAll: (search?: string) =>
    api.get<ApiResponse<CreditCustomer[]>>('/credit-book', {
      params: search ? { search } : undefined,
    }),

  getCustomer: (customerId: string) =>
    api.get<ApiResponse<CreditCustomerDetail>>(`/credit-book/${customerId}`),

  addCredit: (customerId: string, payload: TransactionPayload) =>
    api.post<ApiResponse<CreditTransaction>>(`/credit-book/${customerId}/credit`, payload),

  addPayment: (customerId: string, payload: TransactionPayload) =>
    api.post<ApiResponse<CreditTransaction>>(`/credit-book/${customerId}/payment`, payload),
};
