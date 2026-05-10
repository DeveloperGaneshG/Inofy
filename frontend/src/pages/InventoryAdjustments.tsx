import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Product, InventoryAdjustment, AdjustmentType, AdjustmentReason } from '@/types';
import { productService } from '@/services/productService';
import { inventoryAdjustmentService, CreateAdjustmentPayload } from '@/services/inventoryAdjustmentService';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const REASON_LABELS: Record<AdjustmentReason, string> = {
  DAMAGED: 'Damaged',
  THEFT: 'Theft',
  COUNT_MISMATCH: 'Count Mismatch',
  OPENING_STOCK: 'Opening Stock',
  OTHER: 'Other',
};

const UNIT_TYPES = ['PCS', 'KG', 'G', 'L', 'ML', 'BOX', 'DOZEN', 'PACK'];

export default function InventoryAdjustments() {
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<CreateAdjustmentPayload>({
    productId: '',
    adjustmentType: 'REMOVE',
    reason: 'DAMAGED',
    quantity: 1,
    notes: '',
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const loadAdjustments = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await inventoryAdjustmentService.getAll(p, 20);
      setAdjustments(res.data.data.data);
      setTotal(res.data.data.meta.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdjustments(page);
  }, [loadAdjustments, page]);

  useEffect(() => {
    productService.getAll().then((r) => setProducts(r.data.data));
  }, []);

  const handleProductSearch = (q: string) => {
    setProductSearch(q);
    if (q.length >= 1) {
      setProductResults(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(q.toLowerCase()) ||
            p.sku.toLowerCase().includes(q.toLowerCase()),
        ).slice(0, 8),
      );
    } else {
      setProductResults([]);
    }
  };

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setForm((f) => ({ ...f, productId: p.id }));
    setProductSearch(p.name);
    setProductResults([]);
  };

  const openForm = () => {
    setForm({ productId: '', adjustmentType: 'REMOVE', reason: 'DAMAGED', quantity: 1, notes: '' });
    setSelectedProduct(null);
    setProductSearch('');
    setProductResults([]);
    setError('');
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.productId) { setError('Select a product'); return; }
    if (form.quantity <= 0) { setError('Quantity must be > 0'); return; }
    setSubmitting(true);
    setError('');
    try {
      await inventoryAdjustmentService.create(form);
      setFormOpen(false);
      loadAdjustments(1);
      setPage(1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Adjustments</h1>
          <p className="text-sm text-muted-foreground">{total} total adjustments</p>
        </div>
        <Button onClick={openForm}>
          <Plus className="h-4 w-4" /> New Adjustment
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Product</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Reason</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-left font-medium">Notes</th>
              <th className="px-4 py-3 text-left font-medium">By</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Loading…</td></tr>
            ) : adjustments.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No adjustments yet</td></tr>
            ) : (
              adjustments.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.product.name}</p>
                    <p className="text-xs text-muted-foreground">{a.product.sku}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={a.adjustmentType === 'ADD' ? 'default' : 'destructive'} className="gap-1">
                      {a.adjustmentType === 'ADD'
                        ? <ArrowUpCircle className="h-3 w-3" />
                        : <ArrowDownCircle className="h-3 w-3" />}
                      {a.adjustmentType}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{REASON_LABELS[a.reason]}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {a.adjustmentType === 'ADD' ? '+' : '-'}{a.quantity} {a.product.unitType}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.notes || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(a.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 border-t p-3">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="flex items-center text-sm">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Inventory Adjustment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Product search */}
            <div className="space-y-1">
              <Label>Product *</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search product by name or SKU…"
                  value={productSearch}
                  onChange={(e) => handleProductSearch(e.target.value)}
                />
              </div>
              {productResults.length > 0 && (
                <div className="rounded-md border bg-background shadow-md">
                  {productResults.map((p) => (
                    <button
                      key={p.id}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => selectProduct(p)}
                    >
                      <div className="text-left">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">Stock: {p.stock} {p.unitType}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedProduct && (
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                  <span className="font-medium">{selectedProduct.name}</span>
                  <span className="ml-2 text-muted-foreground">
                    Current stock: <strong>{selectedProduct.stock}</strong> {selectedProduct.unitType}
                  </span>
                </div>
              )}
            </div>

            {/* Adjustment type */}
            <div className="space-y-1">
              <Label>Adjustment Type *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['ADD', 'REMOVE'] as AdjustmentType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, adjustmentType: t }))}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                      form.adjustmentType === t
                        ? t === 'ADD'
                          ? 'border-primary bg-primary text-white'
                          : 'border-destructive bg-destructive text-white'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {t === 'ADD' ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                    {t === 'ADD' ? 'Add Stock' : 'Remove Stock'}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <Label>Reason *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value as AdjustmentReason }))}
              >
                {(Object.entries(REASON_LABELS) as [AdjustmentReason, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="space-y-1">
              <Label>Quantity *{selectedProduct && ` (${selectedProduct.unitType})`}</Label>
              <Input
                type="number"
                min="0.001"
                step={selectedProduct?.allowDecimalQty ? '0.001' : '1'}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
              />
              {selectedProduct && form.adjustmentType === 'REMOVE' && form.quantity > selectedProduct.stock && (
                <p className="text-xs text-destructive">
                  Exceeds current stock ({selectedProduct.stock} {selectedProduct.unitType})
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input
                placeholder="Optional description…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
