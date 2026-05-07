import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Search, Plus, ArrowUpCircle, ArrowDownCircle,
  User, Phone, Clock, TrendingDown, IndianRupee, Users,
  CheckCircle2, ChevronRight, X,
} from 'lucide-react';
import { CreditCustomer, CreditCustomerDetail, CreditSummary, Customer } from '@/types';
import { creditBookService, TransactionPayload } from '@/services/creditBookService';
import { customerService } from '@/services/customerService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatCurrency, formatDate, formatDateShort } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const txSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  description: z.string().optional(),
  note: z.string().optional(),
});
type TxForm = z.infer<typeof txSchema>;

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${color}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function BalanceBadge({ balance }: { balance: number }) {
  if (balance > 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-sm font-semibold text-red-700">
        <TrendingDown className="h-3 w-3" />
        {formatCurrency(balance)}
      </span>
    );
  if (balance < 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-semibold text-blue-700">
        Advance {formatCurrency(Math.abs(balance))}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-sm font-semibold text-green-700">
      <CheckCircle2 className="h-3 w-3" />
      Cleared
    </span>
  );
}

// ─── Transaction Form ─────────────────────────────────────────────────────────

interface TxDialogProps {
  type: 'credit' | 'payment';
  customerId: string;
  customerName: string;
  outstanding: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function TransactionDialog({ type, customerId, customerName, outstanding, open, onClose, onSuccess }: TxDialogProps) {
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
  });

  useEffect(() => {
    if (open) { reset(); setServerError(''); }
  }, [open, reset]);

  const onSubmit = async (data: TxForm) => {
    setServerError('');
    try {
      const payload: TransactionPayload = {
        amount: data.amount,
        description: data.description || undefined,
        note: data.note || undefined,
      };
      if (type === 'credit') await creditBookService.addCredit(customerId, payload);
      else await creditBookService.addPayment(customerId, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err.response?.data?.message || `Failed to record ${type}`);
    }
  };

  const isCredit = type === 'credit';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isCredit ? 'text-red-600' : 'text-green-600'}`}>
            {isCredit ? <ArrowDownCircle className="h-5 w-5" /> : <ArrowUpCircle className="h-5 w-5" />}
            {isCredit ? 'Add Goods on Credit' : 'Record Payment Received'}
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Customer: </span>
          <span className="font-medium">{customerName}</span>
          {outstanding > 0 && (
            <span className="ml-2 text-muted-foreground">
              · Outstanding: <span className="font-semibold text-red-600">{formatCurrency(outstanding)}</span>
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>Amount (₹) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount')}
              placeholder="0.00"
              autoFocus
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>{isCredit ? 'Items / Description' : 'Payment Note'}</Label>
            <Input
              {...register('description')}
              placeholder={isCredit ? 'e.g., Rice 2kg, Oil 1L, Dal 500g' : 'e.g., Paid via UPI'}
            />
          </div>
          <div className="space-y-1">
            <Label>Remarks (optional)</Label>
            <Input {...register('note')} placeholder="Any additional note…" />
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={isCredit ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {isSubmitting ? 'Saving…' : isCredit ? 'Add Credit' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Customer Detail Dialog ───────────────────────────────────────────────────

interface DetailDialogProps {
  customerId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

function CustomerDetailDialog({ customerId, open, onClose, onUpdated }: DetailDialogProps) {
  const [detail, setDetail] = useState<CreditCustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [txDialog, setTxDialog] = useState<'credit' | 'payment' | null>(null);

  const loadDetail = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await creditBookService.getCustomer(customerId);
      setDetail(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (open && customerId) loadDetail();
    if (!open) setDetail(null);
  }, [open, customerId, loadDetail]);

  const handleTxSuccess = () => {
    loadDetail();
    onUpdated();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {detail?.name ?? 'Customer Detail'}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-12 text-muted-foreground">
              Loading…
            </div>
          ) : detail ? (
            <>
              {/* Customer info + balance */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">{detail.name}</p>
                    {detail.phone && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {detail.phone}
                      </p>
                    )}
                    {detail.address && (
                      <p className="text-xs text-muted-foreground">{detail.address}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                    <p className={`text-3xl font-bold ${detail.creditBalance > 0 ? 'text-red-600' : detail.creditBalance < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(detail.creditBalance))}
                    </p>
                    {detail.creditBalance < 0 && (
                      <p className="text-xs text-blue-600">Advance paid</p>
                    )}
                    {detail.creditBalance === 0 && detail.creditTransactions.length > 0 && (
                      <p className="text-xs text-green-600">Fully cleared</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => setTxDialog('credit')}
                  >
                    <ArrowDownCircle className="h-4 w-4 mr-1" />
                    Add Goods Credit
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={detail.creditBalance <= 0}
                    onClick={() => setTxDialog('payment')}
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-1" />
                    Record Payment
                  </Button>
                </div>
              </div>

              {/* Transaction history */}
              <div className="flex-1 overflow-y-auto">
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Transaction History ({detail.creditTransactions.length})
                </p>
                {detail.creditTransactions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No transactions yet</p>
                ) : (
                  <div className="space-y-2">
                    {detail.creditTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
                          tx.type === 'CREDIT' ? 'border-red-100 bg-red-50/50' : 'border-green-100 bg-green-50/50'
                        }`}
                      >
                        <div className={`mt-0.5 shrink-0 ${tx.type === 'CREDIT' ? 'text-red-500' : 'text-green-500'}`}>
                          {tx.type === 'CREDIT'
                            ? <ArrowDownCircle className="h-4 w-4" />
                            : <ArrowUpCircle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-semibold ${tx.type === 'CREDIT' ? 'text-red-700' : 'text-green-700'}`}>
                              {tx.type === 'CREDIT' ? '+' : '−'} {formatCurrency(Number(tx.amount))}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              Balance: <span className={tx.runningBalance! > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                                {formatCurrency(tx.runningBalance!)}
                              </span>
                            </span>
                          </div>
                          {tx.description && (
                            <p className="text-xs text-foreground mt-0.5">{tx.description}</p>
                          )}
                          {tx.note && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">{tx.note}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(tx.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {detail && txDialog && (
        <TransactionDialog
          type={txDialog}
          customerId={detail.id}
          customerName={detail.name}
          outstanding={detail.creditBalance}
          open={!!txDialog}
          onClose={() => setTxDialog(null)}
          onSuccess={handleTxSuccess}
        />
      )}
    </>
  );
}

// ─── New Entry Dialog (for customer without existing credit) ──────────────────

interface NewEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const newEntrySchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  type: z.enum(['credit', 'payment']),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  description: z.string().optional(),
  note: z.string().optional(),
});
type NewEntryForm = z.infer<typeof newEntrySchema>;

function NewEntryDialog({ open, onClose, onSuccess }: NewEntryDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<NewEntryForm>({
    resolver: zodResolver(newEntrySchema),
    defaultValues: { type: 'credit' },
  });

  const selectedCustomerId = watch('customerId');
  const selectedType = watch('type');

  useEffect(() => {
    if (open) {
      customerService.getAll().then((r) => setCustomers(r.data.data));
      reset({ type: 'credit' });
      setCustomerSearch('');
      setServerError('');
    }
  }, [open, reset]);

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q);
  });

  const onSubmit = async (data: NewEntryForm) => {
    setServerError('');
    try {
      const payload: TransactionPayload = {
        amount: data.amount,
        description: data.description || undefined,
        note: data.note || undefined,
      };
      if (data.type === 'credit') await creditBookService.addCredit(data.customerId, payload);
      else await creditBookService.addPayment(data.customerId, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to save entry');
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            New Khata Entry
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setValue('type', 'credit')}
              className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-colors ${
                selectedType === 'credit'
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Goods on Credit
            </button>
            <button
              type="button"
              onClick={() => setValue('type', 'payment')}
              className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-colors ${
                selectedType === 'payment'
                  ? 'border-green-400 bg-green-50 text-green-700'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Payment Received
            </button>
          </div>

          {/* Customer selection */}
          <div className="space-y-2">
            <Label>Customer *</Label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{selectedCustomer.name}</p>
                  {selectedCustomer.phone && (
                    <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                  )}
                </div>
                <button type="button" onClick={() => { setValue('customerId', ''); setCustomerSearch(''); }}>
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search customer by name or phone…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
                {customerSearch.length >= 1 && (
                  <div className="max-h-36 overflow-y-auto rounded-lg border bg-popover shadow-md">
                    {filteredCustomers.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No customers found</p>
                    ) : (
                      filteredCustomers.slice(0, 8).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => { setValue('customerId', c.id); setCustomerSearch(''); }}
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium">{c.name}</p>
                            {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Amount (₹) *</Label>
            <Input type="number" step="0.01" min="0.01" {...register('amount')} placeholder="0.00" />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>{selectedType === 'credit' ? 'Items / Description' : 'Payment Note'}</Label>
            <Input
              {...register('description')}
              placeholder={selectedType === 'credit' ? 'e.g., Rice 2kg, Oil 1L, Dal 500g' : 'e.g., Paid via cash'}
            />
          </div>

          <div className="space-y-1">
            <Label>Remarks (optional)</Label>
            <Input {...register('note')} placeholder="Any additional note…" />
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={selectedType === 'credit' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {isSubmitting ? 'Saving…' : selectedType === 'credit' ? 'Add Credit' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreditBook() {
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [summary, setSummary] = useState<CreditSummary>({ totalOutstanding: 0, debtorCount: 0, clearedCount: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [showCleared, setShowCleared] = useState(false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const [custRes, sumRes] = await Promise.all([
        creditBookService.getAll(q),
        creditBookService.getSummary(),
      ]);
      setCustomers(custRes.data.data);
      setSummary(sumRes.data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (q: string) => {
    setSearch(q);
    if (q.length >= 2 || q === '') load(q || undefined);
  };

  const openDetail = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const displayedCustomers = showCleared
    ? customers
    : customers.filter((c) => c.creditBalance > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BookOpen className="h-6 w-6 text-primary" />
            Khata Book
          </h1>
          <p className="text-sm text-muted-foreground">Track customer credit and payments</p>
        </div>
        <Button onClick={() => setNewEntryOpen(true)}>
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          label="Total Outstanding"
          value={formatCurrency(summary.totalOutstanding)}
          sub="across all customers"
          color="border-red-100"
        />
        <SummaryCard
          label="Active Debtors"
          value={String(summary.debtorCount)}
          sub="customers with balance due"
          color="border-orange-100"
        />
        <SummaryCard
          label="Cleared Accounts"
          value={String(summary.clearedCount)}
          sub="fully paid off"
          color="border-green-100"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowCleared((p) => !p)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
            showCleared ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Show cleared
        </button>
      </div>

      {/* Customer list */}
      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">Loading…</div>
        ) : displayedCustomers.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <BookOpen className="h-8 w-8 opacity-30" />
            <p className="text-sm">
              {customers.length === 0
                ? 'No credit entries yet. Click "New Entry" to get started.'
                : 'No outstanding balances. All cleared!'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {displayedCustomers.map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                onClick={() => openDetail(c.id)}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                  c.creditBalance > 0 ? 'bg-red-500' : c.creditBalance < 0 ? 'bg-blue-500' : 'bg-green-500'
                }`}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{c.name}</p>
                    {c.creditBalance > 0 && (
                      <Badge variant="destructive" className="text-xs">Owes</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </span>
                    )}
                    {c.lastActivity && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateShort(c.lastActivity)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <BalanceBadge balance={c.creditBalance} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <CustomerDetailDialog
        customerId={selectedId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdated={() => load(search || undefined)}
      />

      {/* New entry dialog */}
      <NewEntryDialog
        open={newEntryOpen}
        onClose={() => setNewEntryOpen(false)}
        onSuccess={() => load(search || undefined)}
      />
    </div>
  );
}
