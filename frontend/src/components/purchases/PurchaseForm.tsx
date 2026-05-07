import { useState, useEffect } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { Supplier, Product } from '@/types';
import { supplierService } from '@/services/supplierService';
import { productService } from '@/services/productService';
import { purchaseService, CreatePurchasePayload, PurchaseItemPayload } from '@/services/purchaseService';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ItemRow extends PurchaseItemPayload {
  _product?: Product;
  _search: string;
  _searchResults: Product[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function PurchaseForm({ open, onClose, onCreated }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function emptyRow(): ItemRow {
    return { productId: '', quantity: 1, costPrice: 0, batchNumber: '', expiryDate: '', _search: '', _searchResults: [] };
  }

  useEffect(() => {
    if (!open) return;
    setSupplierId('');
    setNotes('');
    setRows([emptyRow()]);
    setError('');
    supplierService.getAll().then((res) => {
      setSuppliers(res.data.data.filter((s) => s.isActive));
    });
  }, [open]);

  const searchProducts = async (idx: number, q: string) => {
    const updated = [...rows];
    updated[idx]._search = q;
    if (q.length >= 2) {
      const res = await productService.search(q);
      updated[idx]._searchResults = res.data.data;
    } else {
      updated[idx]._searchResults = [];
    }
    setRows(updated);
  };

  const selectProduct = (idx: number, product: Product) => {
    const updated = [...rows];
    updated[idx].productId = product.id;
    updated[idx].costPrice = product.costPrice;
    updated[idx]._product = product;
    updated[idx]._search = product.name;
    updated[idx]._searchResults = [];
    setRows(updated);
  };

  const updateRow = (idx: number, field: keyof PurchaseItemPayload, value: string | number) => {
    const updated = [...rows];
    (updated[idx] as any)[field] = value;
    setRows(updated);
  };

  const addRow = () => setRows([...rows, emptyRow()]);

  const removeRow = (idx: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  const totalAmount = rows.reduce((sum, r) => sum + (r.costPrice || 0) * (r.quantity || 0), 0);

  const handleSubmit = async () => {
    setError('');
    if (!supplierId) { setError('Select a supplier'); return; }
    const validRows = rows.filter((r) => r.productId && r.quantity > 0 && r.costPrice >= 0);
    if (validRows.length === 0) { setError('Add at least one product'); return; }

    setSubmitting(true);
    try {
      const payload: CreatePurchasePayload = {
        supplierId,
        notes: notes || undefined,
        items: validRows.map((r) => ({
          productId: r.productId,
          quantity: r.quantity,
          costPrice: r.costPrice,
          batchNumber: r.batchNumber || undefined,
          expiryDate: r.expiryDate || undefined,
        })),
      };
      await purchaseService.create(payload);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create purchase');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Purchase Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier…" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" />
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="grid grid-cols-[1fr_80px_100px_100px_100px_36px] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span>Product</span>
              <span>Qty</span>
              <span>Cost (₹)</span>
              <span>Batch</span>
              <span>Expiry</span>
              <span />
            </div>

            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_100px_100px_100px_36px] gap-2 border-b px-3 py-2 last:border-0">
                <div className="relative">
                  <Input
                    value={row._search}
                    onChange={(e) => searchProducts(idx, e.target.value)}
                    placeholder="Search product…"
                    className="h-8 text-sm"
                  />
                  {row._searchResults.length > 0 && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border bg-background shadow-lg">
                      {row._searchResults.slice(0, 5).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => selectProduct(idx, p)}
                        >
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <p>{p.name}</p>
                            <p className="text-xs text-muted-foreground">SKU: {p.sku} · Stock: {p.stock}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Input
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) => updateRow(idx, 'quantity', parseInt(e.target.value) || 1)}
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={row.costPrice}
                  onChange={(e) => updateRow(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
                <Input
                  value={row.batchNumber || ''}
                  onChange={(e) => updateRow(idx, 'batchNumber', e.target.value)}
                  placeholder="Batch#"
                  className="h-8 text-sm"
                />
                <Input
                  type="date"
                  value={row.expiryDate || ''}
                  onChange={(e) => updateRow(idx, 'expiryDate', e.target.value)}
                  className="h-8 text-sm"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeRow(idx)}
                  disabled={rows.length === 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4" /> Add Row
            </Button>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Purchase Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
