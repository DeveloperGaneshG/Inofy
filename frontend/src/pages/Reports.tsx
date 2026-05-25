import { useState, useEffect } from 'react';
import { TrendingUp, Package, IndianRupee, Users, Download } from 'lucide-react';
import { reportService } from '@/services/reportService';
import { RevenueReport, TopProduct, InventoryReport, RepeatedCustomer } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function Reports() {
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo] = useState(now.toISOString().split('T')[0]);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(false);

  // Repeat Customers state — has its own date range defaulting to last 3 months
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
  const [rcFrom, setRcFrom] = useState(threeMonthsAgo);
  const [rcTo, setRcTo] = useState(now.toISOString().split('T')[0]);
  const [rcMinBills, setRcMinBills] = useState(2);
  const [rcData, setRcData] = useState<RepeatedCustomer[]>([]);
  const [rcLoading, setRcLoading] = useState(false);

  useEffect(() => { fetchReports(); fetchRepeatedCustomers(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [revRes, topRes, invRes] = await Promise.all([
        reportService.getRevenue(from, to),
        reportService.getTopProducts(10),
        reportService.getInventory(),
      ]);
      setRevenue(revRes.data.data);
      setTopProducts(topRes.data.data);
      setInventory(invRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchRepeatedCustomers = async () => {
    setRcLoading(true);
    try {
      const res = await reportService.getRepeatedCustomers(rcFrom, rcTo, rcMinBills);
      setRcData(res.data.data);
    } finally {
      setRcLoading(false);
    }
  };

  const exportRepeatedCustomersCSV = () => {
    const headers = ['Customer', 'Mobile', 'Entry Date', 'Tot Bills', 'Tot Sales', 'Rep Bills', 'Rep Sales', 'ABV', 'E.Points', 'R.Points'];
    const rows = rcData.map((r) => [
      r.customerName,
      r.phone,
      r.entryDate ? new Date(r.entryDate).toLocaleDateString('en-IN') : '—',
      r.totalBills,
      r.totalSales.toFixed(2),
      r.repeatBills,
      r.repeatSales.toFixed(2),
      r.abv.toFixed(2),
      r.earnedPoints,
      r.redeemedPoints,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `repeat-customers-${rcFrom}-to-${rcTo}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-1">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <Button onClick={fetchReports} disabled={loading}>
            {loading ? 'Loading…' : 'Apply'}
          </Button>
        </CardContent>
      </Card>

      {/* Revenue Summary */}
      {revenue && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Revenue', value: formatCurrency(revenue.totalRevenue), icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total Orders', value: revenue.totalOrders, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Tax (GST)', value: formatCurrency(revenue.totalTax), icon: IndianRupee, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Total Discounts', value: formatCurrency(revenue.totalDiscount), icon: IndianRupee, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Revenue Chart */}
      {revenue && revenue.dailyRevenue.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Over Period</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenue.dailyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(221.2 83.2% 53.3%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((tp, i) => (
                  <TableRow key={tp.product?.id}>
                    <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{tp.product?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{tp.product?.category?.name}</p>
                    </TableCell>
                    <TableCell className="text-right">{tp.totalQuantitySold}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(tp.totalRevenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Inventory Summary */}
        {inventory && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" /> Inventory Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-muted-foreground">Total Products</p>
                  <p className="text-xl font-bold">{inventory.totalProducts}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-muted-foreground">Stock Value</p>
                  <p className="text-xl font-bold">{formatCurrency(inventory.totalStockValue)}</p>
                </div>
                <div className="rounded-lg bg-yellow-50 p-3">
                  <p className="text-yellow-700">Low Stock</p>
                  <p className="text-xl font-bold text-yellow-700">{inventory.lowStockCount}</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-red-700">Out of Stock</p>
                  <p className="text-xl font-bold text-red-700">{inventory.outOfStockCount}</p>
                </div>
              </div>
              {inventory.lowStockProducts.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{p.name}</span>
                  <Badge variant="warning">{p.stock} left</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Repeat Customers Report ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4 text-primary" />
              Repeat Customers
            </CardTitle>
            {rcData.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportRepeatedCustomersCSV}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Filters */}
        <CardContent className="border-t pt-3 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={rcFrom} onChange={(e) => setRcFrom(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={rcTo} onChange={(e) => setRcTo(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Min Visits</Label>
              <Input
                type="number"
                min={2}
                value={rcMinBills}
                onChange={(e) => setRcMinBills(Math.max(2, +e.target.value))}
                className="h-8 w-20 text-xs"
              />
            </div>
            <Button size="sm" onClick={fetchRepeatedCustomers} disabled={rcLoading}>
              {rcLoading ? 'Loading…' : 'Apply'}
            </Button>
          </div>
        </CardContent>

        {/* Summary bar */}
        {rcData.length > 0 && (
          <div className="flex flex-wrap gap-4 border-t border-b bg-muted/30 px-5 py-3 text-sm">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{rcData.length}</span> repeat customers
            </span>
            <span className="text-muted-foreground">
              Total visits:{' '}
              <span className="font-semibold text-foreground">
                {rcData.reduce((s, r) => s + r.totalBills, 0)}
              </span>
            </span>
            <span className="text-muted-foreground">
              Total sales:{' '}
              <span className="font-semibold text-foreground">
                {formatCurrency(rcData.reduce((s, r) => s + r.totalSales, 0))}
              </span>
            </span>
            <span className="text-muted-foreground">
              Range sales:{' '}
              <span className="font-semibold text-primary">
                {formatCurrency(rcData.reduce((s, r) => s + r.repeatSales, 0))}
              </span>
            </span>
          </div>
        )}

        {/* Table */}
        <CardContent className="p-0 overflow-x-auto">
          {rcLoading ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : rcData.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              No repeat customers found for this period
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-5">#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Entry Date</TableHead>
                  <TableHead className="text-center">Tot Bills</TableHead>
                  <TableHead className="text-right">Tot Sales</TableHead>
                  <TableHead className="text-center">Rep Bills</TableHead>
                  <TableHead className="text-right">Rep Sales</TableHead>
                  <TableHead className="text-right">ABV</TableHead>
                  <TableHead className="text-right">E.Points</TableHead>
                  <TableHead className="text-right pr-5">R.Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rcData.map((r, i) => (
                  <TableRow key={r.customerId} className="text-sm">
                    <TableCell className="pl-5 text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.customerName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.phone}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.entryDate ? new Date(r.entryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{r.totalBills}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.totalSales)}</TableCell>
                    <TableCell className="text-center">
                      {r.repeatBills > 0 ? (
                        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">{r.repeatBills}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-primary font-medium">
                      {r.repeatSales > 0 ? formatCurrency(r.repeatSales) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(r.abv)}</TableCell>
                    <TableCell className="text-right">
                      {r.earnedPoints > 0 ? (
                        <span className="text-green-700 font-medium">{r.earnedPoints.toLocaleString()}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      {r.redeemedPoints > 0 ? (
                        <span className="text-orange-600 font-medium">{r.redeemedPoints.toLocaleString()}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
