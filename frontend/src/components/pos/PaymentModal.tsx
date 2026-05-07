import { useState, useMemo } from 'react';
import { CreditCard, Banknote, Smartphone, Loader2, Star } from 'lucide-react';
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

const MIN_POINTS = 10;
const MAX_REDEEM_PERCENT = 0.2;

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
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const baseTotal = getTotalAmount();
  const availablePoints = customer?.loyaltyPoints ?? 0;
  const canRedeem = availablePoints >= MIN_POINTS;

  const pointsDiscount = useMemo(() => {
    if (!redeemPoints || !canRedeem) return 0;
    const maxRedeem = Math.floor(baseTotal * MAX_REDEEM_PERCENT);
    return Math.min(availablePoints, maxRedeem);
  }, [redeemPoints, canRedeem, availablePoints, baseTotal]);

  const finalTotal = baseTotal - pointsDiscount;
  const pointsEarnedAfter = Math.floor(finalTotal / 100);
  const change = paymentMethod === 'CASH' ? (parseFloat(amountTendered) || 0) - finalTotal : 0;

  const handleSubmit = async () => {
    if (paymentMethod === 'CASH' && parseFloat(amountTendered) < finalTotal) {
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
        redeemPoints: redeemPoints && canRedeem,
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
            <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatCurrency(getTaxAmount())}</span></div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>- {formatCurrency(discountAmount)}</span></div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-yellow-600">
                <span className="flex items-center gap-1"><Star className="h-3 w-3" /> Points redeemed ({pointsDiscount} pts)</span>
                <span>- {formatCurrency(pointsDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-bold text-base">
              <span>Total</span><span className="text-primary">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          {/* Loyalty Points Redemption */}
          {customer && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {availablePoints} points available · worth {formatCurrency(availablePoints)}
                    </p>
                  </div>
                </div>
                {canRedeem ? (
                  <button
                    onClick={() => setRedeemPoints((v) => !v)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${redeemPoints ? 'bg-yellow-500' : 'bg-muted-foreground/30'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${redeemPoints ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Min {MIN_POINTS} pts</span>
                )}
              </div>
              {redeemPoints && canRedeem && (
                <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1">
                  Redeeming {pointsDiscount} pts → {formatCurrency(pointsDiscount)} off · You earn {pointsEarnedAfter} pts after this bill
                </p>
              )}
            </div>
          )}

          {/* Payment Method */}
          <div>
            <Label className="mb-2 block">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value)}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-3 text-xs transition-colors ${
                    paymentMethod === value ? 'border-primary bg-primary text-white' : 'hover:bg-muted'
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
                min={finalTotal}
                step="0.01"
                placeholder={`Min: ${finalTotal.toFixed(2)}`}
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
              />
              {change > 0 && (
                <p className="text-sm font-medium text-green-600">Change: {formatCurrency(change)}</p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || items.length === 0}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : `Pay ${formatCurrency(finalTotal)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
