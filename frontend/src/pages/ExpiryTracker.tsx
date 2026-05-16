import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarX2, Download, Settings2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import {
  expirySummary,
  expiryBatches,
  writeOffStock,
  writeOffLog as fetchWriteOffLog,
} from '@/services/expiry.service';
import type { ExpirySummary, ExpiryBatch, ExpiryStatus, WriteOffLog } from '@/types/expiry';

// ─── helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExpiryStatus }) {
  const map: Record<ExpiryStatus, { label: string; cls: string }> = {
    expired: { label: 'Expired',       cls: 'bg-red-50 text-red-700 border-red-200' },
    today:   { label: 'Expires today', cls: 'bg-red-50 text-red-700 border-red-200' },
    week:    { label: 'This week',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    month:   { label: 'This month',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    safe:    { label: 'Safe',          cls: 'bg-green-50 text-green-700 border-green-200' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function DaysLeftCell({ days }: { days: number }) {
  if (days < 0) return <span className="font-medium text-red-600">−{Math.abs(days)} days</span>;
  if (days === 0) return <span className="font-medium text-red-600">Today</span>;
  if (days <= 30) return <span className="font-medium text-amber-600">{days} days</span>;
  return <span className="font-medium text-green-600">{days} days</span>;
}

function SummaryCard({
  label,
  value,
  valueClass = '',
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function rowBg(status: ExpiryStatus) {
  if (status === 'expired' || status === 'today') return 'bg-[#FCEBEB22]';
  if (status === 'week' || status === 'month') return 'bg-[#FAEEDA22]';
  return '';
}

function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── filter config ─────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'expired', label: 'Expired',      activeCls: 'bg-red-600 text-white border-transparent' },
  { key: 'week',   label: 'This week',     activeCls: 'bg-amber-500 text-white border-transparent' },
  { key: 'month',  label: 'This month',    activeCls: 'bg-amber-400 text-white border-transparent' },
  { key: 'safe',   label: 'Safe',          activeCls: 'bg-green-600 text-white border-transparent' },
  { key: 'all',    label: 'All batches',   activeCls: 'bg-gray-700 text-white border-transparent' },
] as const;

function filterCount(key: string, summary: ExpirySummary | null): number | undefined {
  if (!summary) return undefined;
  const map: Record<string, number | undefined> = {
    expired: summary.expired,
    week: summary.thisWeek,
    month: summary.thisMonth,
    safe: summary.safe,
    all: undefined,
  };
  return map[key];
}

// ─── main component ────────────────────────────────────────────────────────────

export default function ExpiryTracker() {
  const [searchParams] = useSearchParams();

  const [summary, setSummary] = useState<ExpirySummary | null>(null);
  const [batches, setBatches] = useState<ExpiryBatch[]>([]);
  const [filter, setFilter] = useState(searchParams.get('filter') ?? 'all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [batchesLoading, setBatchesLoading] = useState(true);

  const [writeOffOpen, setWriteOffOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ExpiryBatch | null>(null);
  const [writeOffQty, setWriteOffQty] = useState(1);
  const [writeOffReason, setWriteOffReason] = useState('');
  const [writeOffLoading, setWriteOffLoading] = useState(false);

  const [logExpanded, setLogExpanded] = useState(false);
  const [logData, setLogData] = useState<WriteOffLog | null>(null);
  const [logLoading, setLogLoading] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await expirySummary();
      setSummary(data);
    } catch {
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const data = await expiryBatches(filter, debouncedSearch);
      setBatches(data);
    } catch {
    } finally {
      setBatchesLoading(false);
    }
  }, [filter, debouncedSearch]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadBatches(); }, [loadBatches]);

  const showNotification = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  const openWriteOff = (batch: ExpiryBatch) => {
    setSelectedBatch(batch);
    setWriteOffQty(1);
    setWriteOffReason('');
    setWriteOffOpen(true);
  };

  const handleWriteOff = async () => {
    if (!selectedBatch) return;
    setWriteOffLoading(true);
    try {
      await writeOffStock({
        purchaseItemId: selectedBatch.purchaseItemId,
        quantityWrittenOff: writeOffQty,
        reason: writeOffReason || undefined,
      });
      setWriteOffOpen(false);
      showNotification('success', `${writeOffQty} units of ${selectedBatch.productName} written off successfully`);
      setLogData(null); // invalidate log cache
      await Promise.all([loadSummary(), loadBatches()]);
    } catch (e: any) {
      showNotification('error', e?.response?.data?.message ?? 'Write-off failed');
    } finally {
      setWriteOffLoading(false);
    }
  };

  const toggleLog = async () => {
    if (!logExpanded && !logData) {
      setLogLoading(true);
      try {
        const data = await fetchWriteOffLog();
        setLogData(data);
      } catch {
      } finally {
        setLogLoading(false);
      }
    }
    setLogExpanded((v) => !v);
  };

  const downloadLogCSV = () => {
    if (!logData) return;
    exportToCSV(
      `write-off-log-${new Date().toISOString().split('T')[0]}.csv`,
      ['Date', 'Product', 'SKU', 'Batch', 'Qty Written Off', 'Cost Price (₹)', 'Value (₹)', 'Reason', 'Written By'],
      logData.items.map((item) => [
        formatDateShort(item.createdAt),
        item.product.name,
        item.product.sku,
        item.purchaseItem.batchNumber ?? '',
        item.quantityWrittenOff,
        item.purchaseItem.costPrice,
        item.quantityWrittenOff * item.purchaseItem.costPrice,
        item.reason ?? '',
        item.user.name,
      ]),
    );
  };

  const exportBatchesCSV = () => {
    exportToCSV(
      `expiry-batches-${new Date().toISOString().split('T')[0]}.csv`,
      ['Product', 'SKU', 'Batch', 'Expiry Date', 'Days Left', 'Qty', 'Cost Price (₹)', 'Supplier', 'Status'],
      batches.map((b) => [
        b.productName,
        b.sku,
        b.batchNumber ?? '',
        formatDateShort(b.expiryDate),
        b.daysLeft,
        b.quantity,
        b.costPrice,
        b.supplierName,
        b.status,
      ]),
    );
  };

  return (
    <div className="space-y-6">
      {/* floating notification */}
      {notification && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm text-white shadow-lg transition-all ${
            notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {notification.msg}
        </div>
      )}

      {/* [A] header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
            <CalendarX2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Expiry tracker</h1>
            <p className="text-xs text-muted-foreground">Monitor and manage batch expiry dates</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportBatchesCSV} disabled={batches.length === 0}>
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm">
            <Settings2 className="mr-1.5 h-4 w-4" />
            Alert settings
          </Button>
        </div>
      </div>

      {/* [B] summary cards */}
      {summaryLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-7 w-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            label="Already expired"
            value={summary?.expired ?? 0}
            valueClass={summary && summary.expired > 0 ? 'text-red-600' : ''}
          />
          <SummaryCard
            label="Expires this week"
            value={summary?.thisWeek ?? 0}
            valueClass={summary && summary.thisWeek > 0 ? 'text-amber-600' : ''}
          />
          <SummaryCard label="Expires this month" value={summary?.thisMonth ?? 0} />
          <SummaryCard
            label="Safe stock"
            value={summary?.safe ?? 0}
            valueClass="text-green-600"
          />
          <SummaryCard
            label="Stock value at risk"
            value={formatCurrency(summary?.stockValueAtRisk ?? 0)}
            valueClass={summary && summary.stockValueAtRisk > 0 ? 'text-red-600' : ''}
          />
        </div>
      )}

      {/* [C] alert banner */}
      {summary && summary.expired > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{summary.expired}</strong> batch{summary.expired > 1 ? 'es are' : ' is'} past
            expiry. Remove from shelves immediately.
          </span>
        </div>
      )}

      {/* [D] filter pills + search */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(({ key, label, activeCls }) => {
          const count = filterCount(key, summary);
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                isActive
                  ? activeCls
                  : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {label}
              {count !== undefined && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${isActive ? 'bg-white/20' : 'bg-muted'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <div className="ml-auto w-56">
          <Input
            placeholder="Search product or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* [E] batches table */}
      <Card>
        <CardContent className="p-0">
          {batchesLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Loading batches…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch no.</TableHead>
                  <TableHead>Expiry date</TableHead>
                  <TableHead>Days left</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No batches found
                    </TableCell>
                  </TableRow>
                ) : (
                  batches.map((batch) => (
                    <TableRow key={batch.purchaseItemId} className={rowBg(batch.status)}>
                      <TableCell>
                        <p className="font-medium">{batch.productName}</p>
                        <p className="text-xs text-muted-foreground">{batch.sku}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {batch.batchNumber ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{formatDateShort(batch.expiryDate)}</TableCell>
                      <TableCell>
                        <DaysLeftCell days={batch.daysLeft} />
                      </TableCell>
                      <TableCell>{batch.quantity}</TableCell>
                      <TableCell>
                        <StatusBadge status={batch.status} />
                      </TableCell>
                      <TableCell className="text-sm">{batch.supplierName}</TableCell>
                      <TableCell>
                        {batch.status === 'safe' ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a href="/purchases">View</a>
                          </Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openWriteOff(batch)}
                            >
                              Write off
                            </Button>
                            {(batch.status === 'week' || batch.status === 'month') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                              >
                                Mark discount
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* [G] write-off log */}
      <Card>
        <button
          onClick={toggleLog}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <p className="text-sm font-medium">Write-off log — this month</p>
            {summary && (
              <p className="text-xs text-muted-foreground">
                {summary.writeOffThisMonth.quantity} units written off ·{' '}
                {formatCurrency(summary.writeOffThisMonth.value)} value
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {logExpanded && logData && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadLogCSV();
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download log
              </Button>
            )}
            {logExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {logExpanded && (
          <CardContent className="border-t p-0">
            {logLoading ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                Loading log…
              </div>
            ) : !logData || logData.items.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                No write-offs recorded this month
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logData.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateShort(item.createdAt)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.purchaseItem.batchNumber ?? '—'}
                      </TableCell>
                      <TableCell>{item.quantityWrittenOff}</TableCell>
                      <TableCell>
                        {formatCurrency(item.quantityWrittenOff * item.purchaseItem.costPrice)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.reason ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">{item.user.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell colSpan={3} className="text-right text-sm">
                      Total this month
                    </TableCell>
                    <TableCell>{logData.totalQuantity}</TableCell>
                    <TableCell>{formatCurrency(logData.totalValue)}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </tfoot>
              </Table>
            )}
          </CardContent>
        )}
      </Card>

      {/* [F] write-off dialog */}
      <Dialog open={writeOffOpen} onOpenChange={setWriteOffOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Write off stock</DialogTitle>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
                <p className="font-medium">{selectedBatch.productName}</p>
                <p className="text-muted-foreground">
                  {selectedBatch.sku}
                  {selectedBatch.batchNumber ? ` · Batch ${selectedBatch.batchNumber}` : ''}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Available qty: <strong>{selectedBatch.quantity}</strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quantity to write off</label>
                <Input
                  type="number"
                  min={1}
                  max={selectedBatch.quantity}
                  value={writeOffQty}
                  onChange={(e) =>
                    setWriteOffQty(
                      Math.min(selectedBatch.quantity, Math.max(1, Number(e.target.value))),
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(writeOffQty * selectedBatch.costPrice)}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Reason <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  placeholder="e.g. Damaged, expired, contaminated…"
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setWriteOffOpen(false)} disabled={writeOffLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleWriteOff} disabled={writeOffLoading}>
              {writeOffLoading ? 'Writing off…' : 'Confirm write-off'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
