import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, Package, AlertTriangle } from 'lucide-react';
import { reportService } from '@/services/reportService';
import { billService } from '@/services/billService';
import { Bill } from '@/types';
import StatsCard from '@/components/dashboard/StatsCard';
import SalesChart from '@/components/dashboard/SalesChart';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Dashboard() {
  const [todaySales, setTodaySales] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [salesData, setSalesData] = useState<{ date: string; revenue: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [dailyRes, inventoryRes, topRes, billsRes] = await Promise.all([
        reportService.getDailySales(today),
        reportService.getInventory(),
        reportService.getTopProducts(5),
        billService.getAll(1, 10),
      ]);

      setTodaySales(dailyRes.data.data.totalSales);
      setTodayOrders(dailyRes.data.data.totalOrders);
      setTotalProducts(inventoryRes.data.data.totalProducts);
      setLowStockCount(inventoryRes.data.data.lowStockCount);
      setTopProducts(
        topRes.data.data.map((t) => ({
          name: t.product?.name?.slice(0, 15) ?? 'Unknown',
          quantity: t.totalQuantitySold,
          revenue: t.totalRevenue,
        })),
      );
      setRecentBills(billsRes.data.data.data);

      // Build last 7 days chart data
      const last7: { date: string; revenue: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7.push({ date: d.toISOString().split('T')[0], revenue: 0 });
      }
      const revenueRes = await reportService.getRevenue(last7[0].date, today);
      revenueRes.data.data.dailyRevenue.forEach(({ date, revenue }) => {
        const entry = last7.find((d) => d.date === date);
        if (entry) entry.revenue = revenue;
      });
      setSalesData(last7);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const statusVariant = (s: string) => {
    if (s === 'PAID') return 'success';
    if (s === 'CANCELLED') return 'destructive';
    return 'secondary';
  };

  if (loading) {
    return <div className="flex h-40 items-center justify-center text-muted-foreground">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Today's Sales"
          value={formatCurrency(todaySales)}
          subtitle={`${todayOrders} orders`}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatsCard
          title="Today's Orders"
          value={todayOrders}
          subtitle="Bills created today"
          icon={ShoppingBag}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatsCard
          title="Total Products"
          value={totalProducts}
          subtitle="In inventory"
          icon={Package}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatsCard
          title="Low Stock Alerts"
          value={lowStockCount}
          subtitle="Products need restock"
          icon={AlertTriangle}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
      </div>

      {/* Charts */}
      <SalesChart salesData={salesData} topProducts={topProducts} />

      {/* Recent Bills */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Bills</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-mono text-xs">{bill.billNumber}</TableCell>
                  <TableCell className="text-sm">{bill.customer?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm">{bill.user?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{bill.paymentMethod}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(bill.totalAmount))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(bill.status) as any}>{bill.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(bill.createdAt)}</TableCell>
                </TableRow>
              ))}
              {recentBills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No bills yet today
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
