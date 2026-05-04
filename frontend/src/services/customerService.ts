import { api } from '@/lib/axios';
import { ApiResponse, Customer, Bill } from '@/types';

export interface CustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export const customerService = {
  getAll: () => api.get<ApiResponse<Customer[]>>('/customers'),
  getById: (id: string) => api.get<ApiResponse<Customer>>(`/customers/${id}`),
  search: (q: string) => api.get<ApiResponse<Customer[]>>(`/customers/search?q=${encodeURIComponent(q)}`),
  getCustomerBills: (id: string) => api.get<ApiResponse<Bill[]>>(`/customers/${id}/bills`),
  create: (data: CustomerPayload) => api.post<ApiResponse<Customer>>('/customers', data),
  update: (id: string, data: Partial<CustomerPayload>) =>
    api.patch<ApiResponse<Customer>>(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};
