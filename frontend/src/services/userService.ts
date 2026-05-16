import { api } from '@/lib/axios';
import { ApiResponse, User, Role } from '@/types';

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}

export const userService = {
  getAll: () => api.get<ApiResponse<User[]>>('/users'),

  create: (dto: CreateUserDto) =>
    api.post<ApiResponse<User>>('/auth/register', dto),

  update: (id: string, dto: UpdateUserDto) =>
    api.patch<ApiResponse<User>>(`/users/${id}`, dto),

  toggleActive: (id: string) =>
    api.patch<ApiResponse<User>>(`/users/${id}/toggle-active`),

  remove: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/users/${id}`),
};
