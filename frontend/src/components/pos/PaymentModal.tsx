import { useState, useMemo, useEffect } from 'react';
import { CreditCard, Banknote, Smartphone, Loader2, Star, BookOpen, UserSearch, X } from 'lucide-react';
import { Bill, Customer, PaymentMethod } from '@/types';
import { useCartStore } from '@/store/cartStore';
import { billService } from '@/services/billService';
import { customerService } from '@/services/customerService';
import { creditBookService } from '@/services/creditBookService';
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
  onCustomerChange: (customer: Customer | null) => void;
  onSuccess: (bill: Bill) => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
];

export default function PaymentModal({ open, onClose, customer, onCustomerChange, onSuccess }: Props) {
  const { items, discountAmount, getSubtotal, getTaxAmount, getTotalAmount, clearCart } = useCartStore();

  // Local customer state — pre-filled from prop, editable inside modal
  const [localCustomer, setLocalCustomer] = useState<Customer | null>(customer);
  const [customerQuery, setCustomerQuery] = useState(customer?.name ?? '');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [kathaBalance, setKathaBalance] = useState(0);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountTendered, setAmountTendered] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [useKatha, setUseKatha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync state when modal opens/closes
  useEffect(() => {
    if (open) {
      setLocalCustomer(customer);
      setCustomerQuery(customer?.name ?? '');
      setCustomerResults([]);
      setPaymentMethod('CASH');
      setAmountTendered('');
      setRedeemPoints(false);
      setUseKatha(false);
      setError('');
      setKathaBalance(0);
    }
  }, [open]);

  // Fetch katha balance whenever customer changes
  useEffect(() => {
    if (!localCustomer) { setKathaBalance(0); return; }
    creditBookService.getCustomer(localCustomer.id)
      .then((res) => setKathaBalance(Number(res.data.data.creditBalance)))
      .catch(() => setKathaBalance(0));
  }, [localCustomer?.id]);

  const handleCustomerSearch = async (q: string) => {
    setCustomerQuery(q);
    if (q.length >= 2) {
      const res = await customerService.search(q);
      setCustomerResults(res.data.data);
    } else {
      setCustomerResults([]);
    }
  };

  const selectCustomer = (c: Customer) => {
    setLocalCustomer(c);
    setCustomerQuery(c.name);
    setCustomerResults([]);
    setUseKatha(false);
    setRedeemPoints(false);
    onCustomerChange(c);
  };

  const clearCustomer = () => {
    setLocalCustomer(null);
    setCustomerQuery('');
    setCustomerResults([]);
    setKathaBalance(0);
    setUseKatha(false);
    setRedeemPoints(false);
    onCustomerChange(null);
  };

  const baseTotal = getTotalAmount();
  const availablePoints = localCustomer?.loyaltyPoints ?? 0;
  const canRedeem = availablePoints >= MIN_POINTS;

  const pointsDiscount = useMemo(() => {
    if (!redeemPoints || !canRedeem) return 0;
    const maxRedeem = Math.floor(baseTotal * MAX_REDEEM_PERCENT);
    return Math.min(availablePoints, maxRedeem);
  }, [redeemPoints, canRedeem, availablePoints, baseTotal]);

  const finalTotal = baseTotal - pointsDiscount;
  const pointsEarnedAfter = Math.floor(finalTotal / 100);
  const change = paymentMethod === 'CASH' ? (parseFloat(amountTendered) || 0) - finalTotal : 0;
  const effectivePaymentMethod: PaymentMethod = useKatha ? 'CREDIT' : paymentMethod;

  const handleSubmit = async () => {
    if (useKatha && !localCustomer) {
      setError('Select a customer to use Katha');
      return;
    }
    if (!useKatha && paymentMethod === 'CASH' && parseFloat(amountTendered) < finalTotal) {
      setError('Amount tendered is less than total');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await billService.create({
        customerId: localCustomer?.id,
        paymentMethod: effectivePaymentMethod,
        discountAmount,
        redeemPoints: !useKatha && redeemPoints && canRedeem,
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.discount > 0 ? i.unitPrice * (1 - i.discount / 100) : i.unitPrice,
        })),
      });
      clearCart();
      onSuccess(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                <span className="flex items-center gap-1"><Star className="h-3 w-3" /> Points redeemed</span>
                <span>- {formatCurrency(pointsDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-bold text-base">
              <span>Total</span><span className="text-primary">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          {/* ── Customer Section ── */}
          <div className="space-y-2">
            <Label>Customer</Label>
            {localCustomer ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{localCustomer.name}</p>
                  {localCustomer.phone && (
                    <p className="text-xs text-muted-foreground">{localCustomer.phone}</p>
                  )}
                </div>
                <button onClick={clearCustomer} className="rounded-full p-1 hover:bg-muted">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <UserSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by name or phone…"
                  value={customerQuery}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setCustomerResults([]), 200)}
                />
                {customerResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow-lg">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted"
                        onMouseDown={() => selectCustomer(c)}
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Katha outstanding balance alert */}
            {localCustomer && kathaBalance > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span>Outstanding Katha: <strong>{formatCurrency(kathaBalance)}</strong></span>
              </div>
            )}
          </div>

          {/* ── Katha Toggle ── */}
          {localCustomer && (
            <button
              onClick={() => { setUseKatha((v) => !v); setRedeemPoints(false); }}
              className={`flex w-full items-center justify-between rounded-lg border p-3 transition-colors ${
                useKatha ? 'border-orange-400 bg-orange-50' : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className={`h-4 w-4 ${useKatha ? 'text-orange-500' : 'text-muted-foreground'}`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${useKatha ? 'text-orange-700' : ''}`}>Katha — Pay Later</p>
                  <p className="text-xs text-muted-foreground">Bill added to {localCustomer.name}'s khata book</p>
                </div>
              </div>
              <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${useKatha ? 'bg-orange-400' : 'bg-muted-foreground/30'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${useKatha ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
          )}

          {/* ── Loyalty Points ── hidden for Katha */}
          {localCustomer && !useKatha && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">{localCustomer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {availablePoints} pts · worth {formatCurrency(availablePoints)}
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
                  <span className="text-xs text-muted-foreground">Min {MIN_POINTS} pts to redeem</span>
                )}
              </div>
              {redeemPoints && canRedeem && (
                <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1">
                  Redeeming {pointsDiscount} pts → {formatCurrency(pointsDiscount)} off · Earn {pointsEarnedAfter} pts after this bill
                </p>
              )}
            </div>
          )}

          {/* ── Payment Method — hidden for Katha ── */}
          {!useKatha && (
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
          )}

          {/* ── Cash Tendered ── */}
          {!useKatha && paymentMethod === 'CASH' && (
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
          <Button
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
            className={useKatha ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
              : useKatha
                ? <><BookOpen className="mr-1 h-4 w-4" /> Add to Katha — {formatCurrency(finalTotal)}</>
                : `Pay ${formatCurrency(finalTotal)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
