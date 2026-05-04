import { api } from '@/lib/axios';
import { ApiResponse, User } from '@/types';

export const authService = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ access_token: string; user: User }>>('/auth/login', { email, password }),

  me: () => api.get<ApiResponse<User>>('/auth/me'),
};
