import { api } from '@/lib/axios';
import { ReturnType } from '@/types';

export interface CreateReturnPayload {
  billId: string;
  type: ReturnType;
  reason?: string;
  items: { billItemId: string; quantity: number }[];
}

export const returnService = {
  create: (payload: CreateReturnPayload) => api.post('/returns', payload),
  getByBill: (billId: string) => api.get(`/returns?billId=${billId}`),
};
