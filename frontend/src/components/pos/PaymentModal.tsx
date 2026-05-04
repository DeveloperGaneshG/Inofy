import { useState } from 'react';
import { CreditCard, Banknote, Smartphone, Loader2 } from 'lucide-react';
import { Customer, PaymentMethod } from '@/types';
import { useCartStore } from '@/store/cartStore';
import { billService } from '@/services/billService';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSuccess: (billId: string) => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
];

export default function PaymentModal({ open, onClose, customer, onSuccess }: Props) {
  const { items, discountAmount, getSubtotal, getTaxAmount, getTotalAmount, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountTendered, setAmountTendered] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = getTotalAmount();
  const change = paymentMethod === 'CASH' ? (parseFloat(amountTendered) || 0) - total : 0;

  const handleSubmit = async () => {
    if (paymentMethod === 'CASH' && parseFloat(amountTendered) < total) {
      setError('Amount tendered is less than total');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await billService.create({
        customerId: customer?.id,
        paymentMethod,
        discountAmount,
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      clearCart();
      onSuccess(res.data.data.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(getSubtotal())}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST (18%)</span><span>{formatCurrency(getTaxAmount())}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>- {formatCurrency(discountAmount)}</span></div>
            <div className="flex justify-between border-t pt-1 font-bold text-base">
              <span>Total</span><span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label className="mb-2 block">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value)}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-3 text-xs transition-colors ${
                    paymentMethod === value
                      ? 'border-primary bg-primary text-white'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cash tendered */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-1.5">
              <Label htmlFor="tendered">Amount Tendered (₹)</Label>
              <Input
                id="tendered"
                type="number"
                min={total}
                step="0.01"
                placeholder={`Min: ${total.toFixed(2)}`}
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
              />
              {change > 0 && (
                <p className="text-sm font-medium text-green-600">
                  Change: {formatCurrency(change)}
                </p>
              )}
            </div>
          )}

          {customer && (
            <p className="text-xs text-muted-foreground">
              Customer: <span className="font-medium text-foreground">{customer.name}</span>
              {' '}· Loyalty pts: {customer.loyaltyPoints}
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || items.length === 0}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : `Pay ${formatCurrency(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
