import { useState, useEffect } from 'react';
import { Plus, Trash2, Package, X } from 'lucide-react';
import { Supplier, Product } from '@/types';
import { supplierService } from '@/services/supplierService';
import { productService } from '@/services/productService';
import { purchaseService, CreatePurchasePayload, PurchaseItemPayload } from '@/services/purchaseService';
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

function emptyRow(): ItemRow {
  return {
    productId: '',
    quantity: 1,
    costPrice: 0,
    batchNumber: '',
    expiryDate: '',
    _product: undefined,
    _search: '',
    _searchResults: [],
  };
}

export default function PurchaseForm({ open, onClose, onCreated }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  // Update a single field on a row — immutable, no state mutation
  const updateRow = (idx: number, patch: Partial<ItemRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const searchProducts = async (idx: number, q: string) => {
    // Update search text immediately (synchronous, no race)
    updateRow(idx, { _search: q, _searchResults: [] });
    if (q.length < 2) return;
    try {
      const res = await productService.search(q);
      // Use functional setter so we always apply to the LATEST state
      setRows((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, _searchResults: res.data.data } : r)),
      );
    } catch {}
  };

  const selectProduct = (idx: number, product: Product) => {
    updateRow(idx, {
      productId: product.id,
      costPrice: Math.round(product.costPrice),
      _product: product,
      _search: product.name,
      _searchResults: [],
    });
  };

  const clearRowProduct = (idx: number) => {
    updateRow(idx, {
      productId: '',
      costPrice: 0,
      _product: undefined,
      _search: '',
      _searchResults: [],
    });
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (idx: number) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalAmount = rows.reduce((sum, r) => sum + (r.costPrice || 0) * (r.quantity || 0), 0);

  const handleSubmit = async () => {
    setError('');
    if (!supplierId) { setError('Select a supplier'); return; }
    const validRows = rows.filter((r) => r.productId && r.quantity > 0 && r.costPrice >= 0);
    if (validRows.length === 0) { setError('Add at least one product with a valid quantity'); return; }

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Purchase Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supplier + Notes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          {/* Item rows */}
          <div className="rounded-lg border overflow-x-auto">
            {/* Header */}
            <div
              className="grid gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground"
              style={{ gridTemplateColumns: '1fr 80px 90px 100px 110px 68px', minWidth: '560px' }}
            >
              <span>Product</span>
              <span>Qty</span>
              <span>Cost (₹)</span>
              <span>Batch #</span>
              <span>Expiry</span>
              <span />
            </div>

            {rows.map((row, idx) => (
              <div
                key={idx}
                className="grid gap-2 border-b px-3 py-2 last:border-0 items-center"
                style={{ gridTemplateColumns: '1fr 80px 90px 100px 110px 68px', minWidth: '560px' }}
              >
                {/* Product cell */}
                <div className="relative">
                  {row._product ? (
                    /* Selected product — show name with a clear button */
                    <div className="flex h-8 items-center gap-1 rounded-md border bg-muted/40 px-2 text-sm">
                      <span className="flex-1 truncate font-medium">{row._product.name}</span>
                      <button
                        type="button"
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                        onClick={() => clearRowProduct(idx)}
                        title="Clear product"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* No product yet — show search input */
                    <Input
                      value={row._search}
                      onChange={(e) => searchProducts(idx, e.target.value)}
                      onBlur={() =>
                        setTimeout(
                          () => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, _searchResults: [] } : r))),
                          150,
                        )
                      }
                      placeholder="Search product…"
                      className="h-8 text-sm"
                    />
                  )}

                  {/* Search results dropdown */}
                  {row._searchResults.length > 0 && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-background shadow-lg">
                      {row._searchResults.slice(0, 6).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                          onMouseDown={() => selectProduct(idx, p)}
                        >
                          <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              SKU: {p.sku} · Stock: {p.stock} · Cost: ₹{Math.round(p.costPrice)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Qty */}
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={row.quantity}
                  onChange={(e) => updateRow(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="h-8 text-sm"
                />

                {/* Cost — integer only */}
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={row.costPrice || ''}
                  placeholder="0"
                  onChange={(e) => updateRow(idx, { costPrice: parseInt(e.target.value) || 0 })}
                  className="h-8 text-sm"
                />

                {/* Batch # */}
                <Input
                  value={row.batchNumber || ''}
                  onChange={(e) => updateRow(idx, { batchNumber: e.target.value })}
                  placeholder="Batch #"
                  className="h-8 text-sm"
                />

                {/* Expiry date */}
                <Input
                  type="date"
                  value={row.expiryDate || ''}
                  onChange={(e) => updateRow(idx, { expiryDate: e.target.value })}
                  className="h-8 text-sm"
                />

                {/* Actions: Clear Row + Remove Row */}
                <div className="flex items-center gap-1">
                  {/* Clear row — resets to empty without removing */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Clear row"
                    onClick={() => {
                      setRows((prev) => prev.map((r, i) => (i === idx ? emptyRow() : r)));
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  {/* Remove row — deletes it entirely */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Remove row"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer: Add Row + Total */}
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4" /> Add Row
            </Button>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold">
                ₹{totalAmount.toLocaleString('en-IN')}
              </p>
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
