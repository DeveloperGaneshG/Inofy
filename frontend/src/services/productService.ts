import { api } from '@/lib/axios';
import { ApiResponse, Product } from '@/types';

export type CreateProductPayload = Omit<Product, 'id' | 'category' | 'createdAt'>;
export type UpdateProductPayload = Partial<CreateProductPayload>;

export const productService = {
  getAll: () => api.get<ApiResponse<Product[]>>('/products'),
  getById: (id: string) => api.get<ApiResponse<Product>>(`/products/${id}`),
  search: (q: string) => api.get<ApiResponse<Product[]>>(`/products/search?q=${encodeURIComponent(q)}`),
  getLowStock: () => api.get<ApiResponse<Product[]>>('/products/low-stock'),
  create: (data: CreateProductPayload) => api.post<ApiResponse<Product>>('/products', data),
  update: (id: string, data: UpdateProductPayload) => api.patch<ApiResponse<Product>>(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};
