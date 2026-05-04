import { useState, useEffect } from 'react';
import { TrendingUp, Package, IndianRupee } from 'lucide-react';
import { reportService } from '@/services/reportService';
import { RevenueReport, TopProduct, InventoryReport } from '@/types';
import { formatCurrency } from '@/lib/utils';
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

  useEffect(() => { fetchReports(); }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="flex items-end gap-4 p-4">
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
          <CardContent className="p-0">
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
    </div>
  );
}
