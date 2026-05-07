import { useState, useMemo } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { Bill, BillItem, ReturnType } from '@/types';
import { returnService } from '@/services/returnService';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props {
  bill: Bill;
  open: boolean;
  onClose: () => void;
  onReturned: () => void;
}

export default function ReturnModal({ bill, open, onClose, onReturned }: Props) {
  const [returnType, setReturnType] = useState<ReturnType>('REFUND');
  const [reason, setReason] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Compute how many units of each bill item have already been returned
  const returnedMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const ret of bill.returns ?? []) {
      for (const ri of ret.items) {
        map[ri.billItemId] = (map[ri.billItemId] ?? 0) + ri.quantity;
      }
    }
    return map;
  }, [bill.returns]);

  const maxReturnable = (item: BillItem) => item.quantity - (returnedMap[item.id] ?? 0);

  const setQty = (billItemId: string, val: number, max: number) => {
    setQuantities((prev) => ({ ...prev, [billItemId]: Math.min(Math.max(0, val), max) }));
  };

  const selectedItems = bill.items
    .map((item) => ({ item, qty: quantities[item.id] ?? 0 }))
    .filter(({ qty }) => qty > 0);

  const refundAmount = selectedItems.reduce(
    (sum, { item, qty }) => sum + Number(item.unitPrice) * qty,
    0,
  );

  const handleSubmit = async () => {
    if (selectedItems.length === 0) { setError('Select at least one item to return'); return; }
    setError('');
    setLoading(true);
    try {
      await returnService.create({
        billId: bill.id,
        type: returnType,
        reason: reason || undefined,
        items: selectedItems.map(({ item, qty }) => ({ billItemId: item.id, quantity: qty })),
      });
      onReturned();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process return');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuantities({});
    setReason('');
    setReturnType('REFUND');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Return Items — {bill.billNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Return type toggle */}
          <div>
            <Label className="mb-2 block">Return Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['REFUND', 'EXCHANGE'] as ReturnType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setReturnType(t)}
                  className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                    returnType === t ? 'border-primary bg-primary text-white' : 'hover:bg-muted'
                  }`}
                >
                  {t === 'REFUND' ? '💰 Refund' : '🔄 Exchange'}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {returnType === 'REFUND'
                ? 'Cash/payment refund to customer. Stock will be restored.'
                : 'Customer exchanges for another item. Stock restored; process new sale at POS.'}
            </p>
          </div>

          {/* Items */}
          <div>
            <Label className="mb-2 block">Select Items to Return</Label>
            <div className="rounded-lg border divide-y">
              {bill.items.map((item) => {
                const max = maxReturnable(item);
                const qty = quantities[item.id] ?? 0;
                const alreadyReturned = returnedMap[item.id] ?? 0;
                return (
                  <div key={item.id} className={`flex items-center gap-3 px-3 py-2.5 ${max === 0 ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product?.name ?? item.productId}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(Number(item.unitPrice))} × {item.quantity} billed
                        {alreadyReturned > 0 && ` · ${alreadyReturned} already returned`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        className="flex h-6 w-6 items-center justify-center rounded border text-sm disabled:opacity-30"
                        disabled={qty === 0 || max === 0}
                        onClick={() => setQty(item.id, qty - 1, max)}
                      >−</button>
                      <Input
                        type="number"
                        className="h-7 w-14 text-center text-sm px-1"
                        value={qty}
                        min={0}
                        max={max}
                        disabled={max === 0}
                        onChange={(e) => setQty(item.id, parseInt(e.target.value) || 0, max)}
                      />
                      <button
                        className="flex h-6 w-6 items-center justify-center rounded border text-sm disabled:opacity-30"
                        disabled={qty >= max}
                        onClick={() => setQty(item.id, qty + 1, max)}
                      >+</button>
                      <span className="w-12 text-right text-xs text-muted-foreground">/ {max}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <Label>Reason <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="Defective, wrong item, customer changed mind…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Refund preview */}
          {selectedItems.length > 0 && (
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {returnType === 'REFUND' ? 'Refund Amount' : 'Exchange Credit'}
                </span>
                <span className="text-lg font-bold text-primary">{formatCurrency(refundAmount)}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedItems.length} item type{selectedItems.length > 1 ? 's' : ''} ·{' '}
                {selectedItems.reduce((s, { qty }) => s + qty, 0)} unit{selectedItems.reduce((s, { qty }) => s + qty, 0) > 1 ? 's' : ''} · stock will be restored
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || selectedItems.length === 0}>
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
              : `${returnType === 'REFUND' ? 'Refund' : 'Exchange'} ${selectedItems.length > 0 ? formatCurrency(refundAmount) : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
