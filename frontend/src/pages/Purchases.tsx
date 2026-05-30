import { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Clock, Eye, RefreshCw } from 'lucide-react';
import { Purchase, PurchaseStatus } from '@/types';
import { purchaseService } from '@/services/purchaseService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PurchaseForm from '@/components/purchases/PurchaseForm';

const STATUS_CONFIG: Record<PurchaseStatus, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Draft', icon: Clock, variant: 'secondary' },
  RECEIVED: { label: 'Received', icon: CheckCircle, variant: 'default' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, variant: 'destructive' },
};

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<Purchase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => { loadPurchases(); }, [page, statusFilter]);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const res = await purchaseService.getAll(page, 10, statusFilter || undefined);
      const paged = res.data.data;
      setPurchases(paged.data);
      setTotal(paged.meta.total);
      setTotalPages(paged.meta.totalPages);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailPurchase(null);
    const res = await purchaseService.getOne(id);
    setDetailPurchase(res.data.data);
    setDetailLoading(false);
  };

  const handleReceive = async (id: string) => {
    setActionLoading(id);
    try {
      await purchaseService.receive(id);
      loadPurchases();
      if (detailPurchase?.id === id) openDetail(id);
    } finally {
      setActionLoading('');
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    try {
      await purchaseService.cancel(id);
      loadPurchases();
      if (detailPurchase?.id === id) setDetailPurchase(null);
    } finally {
      setActionLoading('');
    }
  };

  const statusFilters: (PurchaseStatus | '')[] = ['', 'DRAFT', 'RECEIVED', 'CANCELLED'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchases</h1>
          <p className="text-sm text-muted-foreground">{total} total purchase orders</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> New Purchase
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            onClick={() => { setStatusFilter(s); setPage(1); }}
          >
            {s === '' ? 'All' : STATUS_CONFIG[s].label}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">Loading…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => {
                const cfg = STATUS_CONFIG[p.status];
                const StatusIcon = cfg.icon;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-medium">{p.purchaseNumber}</TableCell>
                    <TableCell>{p.supplier.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p._count?.items ?? p.items?.length ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(p.totalAmount))}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <StatusIcon className="h-3.5 w-3.5" />
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openDetail(p.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {p.status === 'DRAFT' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              disabled={actionLoading === p.id}
                              onClick={() => handleReceive(p.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Receive
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={actionLoading === p.id}
                              onClick={() => handleCancel(p.id)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {purchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No purchases found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <PurchaseForm open={formOpen} onClose={() => setFormOpen(false)} onCreated={loadPurchases} />

      <Dialog open={!!detailPurchase || detailLoading} onOpenChange={() => setDetailPurchase(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailPurchase ? `Purchase: ${detailPurchase.purchaseNumber}` : 'Loading…'}
            </DialogTitle>
          </DialogHeader>
          {detailPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Supplier</p>
                  <p className="font-medium">{detailPurchase.supplier.name}</p>
                  {detailPurchase.supplier.phone && <p className="text-xs text-muted-foreground">{detailPurchase.supplier.phone}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={STATUS_CONFIG[detailPurchase.status].variant}>
                    {STATUS_CONFIG[detailPurchase.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created By</p>
                  <p className="font-medium">{detailPurchase.user.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Received At</p>
                  <p className="font-medium">{detailPurchase.receivedAt ? formatDate(detailPurchase.receivedAt) : '—'}</p>
                </div>
                {detailPurchase.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p>{detailPurchase.notes}</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border overflow-x-auto">
                <div className="grid grid-cols-[1fr_60px_80px_80px_80px_80px] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground" style={{minWidth: '480px'}}>
                  <span>Product</span>
                  <span>Qty</span>
                  <span>Cost</span>
                  <span>Total</span>
                  <span>Batch</span>
                  <span>Expiry</span>
                </div>
                {detailPurchase.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_60px_80px_80px_80px_80px] gap-2 border-b px-3 py-2 text-sm last:border-0" style={{minWidth: '480px'}}>
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                    </div>
                    <span>{item.quantity}</span>
                    <span>{formatCurrency(Number(item.costPrice))}</span>
                    <span className="font-medium">{formatCurrency(Number(item.totalCost))}</span>
                    <span className="font-mono text-xs">{item.batchNumber ?? '—'}</span>
                    <span className="text-xs">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN') : '—'}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="font-medium">Total Amount</span>
                <span className="text-lg font-bold">{formatCurrency(Number(detailPurchase.totalAmount))}</span>
              </div>

              {detailPurchase.status === 'DRAFT' && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    disabled={!!actionLoading}
                    onClick={() => handleCancel(detailPurchase.id)}
                  >
                    <XCircle className="h-4 w-4" /> Cancel PO
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!!actionLoading}
                    onClick={() => handleReceive(detailPurchase.id)}
                  >
                    <RefreshCw className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} />
                    Mark as Received
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
