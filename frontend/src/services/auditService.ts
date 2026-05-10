import { api } from '@/lib/axios';
import { ApiResponse, AuditLog, PaginatedData } from '@/types';

export const auditService = {
  getAll: (page = 1, limit = 50, entity?: string, userId?: string) =>
    api.get<ApiResponse<PaginatedData<AuditLog>>>('/audit-logs', {
      params: { page, limit, ...(entity ? { entity } : {}), ...(userId ? { userId } : {}) },
    }),
};
