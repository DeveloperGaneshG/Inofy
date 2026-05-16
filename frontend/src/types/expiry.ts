export type ExpiryStatus = 'expired' | 'today' | 'week' | 'month' | 'safe';

export interface ExpirySummary {
  expired: number;
  thisWeek: number;
  thisMonth: number;
  safe: number;
  stockValueAtRisk: number;
  writeOffThisMonth: { quantity: number; value: number };
}

export interface ExpiryBatch {
  purchaseItemId: string;
  productId: string;
  productName: string;
  sku: string;
  batchNumber: string | null;
  expiryDate: string;
  daysLeft: number;
  quantity: number;
  costPrice: number;
  supplierId: string;
  supplierName: string;
  status: ExpiryStatus;
}

export interface WriteOffDto {
  purchaseItemId: string;
  quantityWrittenOff: number;
  reason?: string;
}

export interface WriteOffLogItem {
  id: string;
  purchaseItemId: string;
  productId: string;
  quantityWrittenOff: number;
  reason: string | null;
  writtenOffBy: string;
  createdAt: string;
  product: { id: string; name: string; sku: string };
  user: { id: string; name: string; email: string };
  purchaseItem: { costPrice: number; batchNumber: string | null };
}

export interface WriteOffLog {
  items: WriteOffLogItem[];
  totalQuantity: number;
  totalValue: number;
}

export interface ExpiryAlerts {
  expired: number;
  thisWeek: number;
  total: number;
}
