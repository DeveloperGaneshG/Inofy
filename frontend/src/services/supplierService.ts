import { api } from '@/lib/axios';
import { ApiResponse, Supplier } from '@/types';

export interface SupplierPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
}

export const supplierService = {
  getAll: (search?: string) =>
    api.get<ApiResponse<Supplier[]>>('/suppliers', { params: search ? { search } : undefined }),

  getOne: (id: string) => api.get<ApiResponse<Supplier>>(`/suppliers/${id}`),

  create: (payload: SupplierPayload) => api.post<ApiResponse<Supplier>>('/suppliers', payload),

  update: (id: string, payload: Partial<SupplierPayload> & { isActive?: boolean }) =>
    api.put<ApiResponse<Supplier>>(`/suppliers/${id}`, payload),

  delete: (id: string) => api.delete(`/suppliers/${id}`),
};
