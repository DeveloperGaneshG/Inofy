import { useState, useEffect } from 'react';
import { Eye, XCircle, Search } from 'lucide-react';
import { Bill } from '@/types';
import { billService } from '@/services/billService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Invoice from '@/components/Invoice';

export default function Invoices() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Bill | null>(null);

  useEffect(() => {
    loadBills();
  }, [page]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const res = await billService.getAll(page, 15);
      const paginatedData = res.data.data;
      setBills(paginatedData.data);
      setTotalPages(paginatedData.meta.totalPages);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBill = async (id: string) => {
    const res = await billService.getById(id);
    setSelectedBill(res.data.data);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    await billService.updateStatus(cancelTarget.id, 'CANCELLED');
    setCancelTarget(null);
    loadBills();
  };

  const statusVariant = (s: string) => {
    if (s === 'PAID') return 'success';
    if (s === 'CANCELLED') return 'destructive';
    return 'secondary';
  };

  const filtered = bills.filter(
    (b) =>
      !search ||
      b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.customer?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">All billing transactions</p>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search bill no. or customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">Loading…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-mono text-xs font-medium">{bill.billNumber}</TableCell>
                  <TableCell className="text-sm">{bill.customer?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm">{bill.user?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm">{bill.items?.length ?? 0} items</TableCell>
                  <TableCell><Badge variant="outline">{bill.paymentMethod}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(Number(bill.totalAmount))}</TableCell>
                  <TableCell><Badge variant={statusVariant(bill.status) as any}>{bill.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(bill.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleViewBill(bill.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {bill.status !== 'CANCELLED' && (
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setCancelTarget(bill)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No invoices found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</Button>
          <span className="flex items-center text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next →</Button>
        </div>
      )}

      {/* Invoice Preview Dialog */}
      {selectedBill && (
        <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice — {selectedBill.billNumber}</DialogTitle>
            </DialogHeader>
            <Invoice bill={selectedBill} />
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Confirmation */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
            <h3 className="font-semibold">Cancel Bill?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Cancelling <strong>{cancelTarget.billNumber}</strong> will restore product stock. This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep Bill</Button>
              <Button variant="destructive" onClick={handleCancel}>Cancel Bill</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
