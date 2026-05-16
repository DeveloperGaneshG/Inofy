import { api } from '@/lib/axios';
import type { ExpirySummary, ExpiryBatch, WriteOffDto, WriteOffLog, ExpiryAlerts } from '@/types/expiry';

export const expirySummary = (): Promise<ExpirySummary> =>
  api.get('/expiry/summary').then((r) => r.data.data);

export const expiryBatches = (filter = 'all', search = ''): Promise<ExpiryBatch[]> =>
  api.get('/expiry/batches', { params: { filter, search } }).then((r) => r.data.data);

export const writeOffStock = (payload: WriteOffDto): Promise<{ writeOffId: string; message: string }> =>
  api.post('/expiry/write-off', payload).then((r) => r.data.data);

export const writeOffLog = (from?: string, to?: string): Promise<WriteOffLog> =>
  api.get('/expiry/write-off-log', { params: { from, to } }).then((r) => r.data.data);

export const expiryAlerts = (): Promise<ExpiryAlerts> =>
  api.get('/expiry/alerts').then((r) => r.data.data);
