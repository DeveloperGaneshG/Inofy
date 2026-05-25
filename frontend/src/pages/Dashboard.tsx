import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, Package, AlertTriangle, Users } from 'lucide-react';
import { reportService } from '@/services/reportService';
import { billService } from '@/services/billService';
import { Bill, RepeatedCustomer } from '@/types';
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
  const [topRepeatCustomers, setTopRepeatCustomers] = useState<RepeatedCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];

      const [dailyRes, inventoryRes, topRes, billsRes, rcRes] = await Promise.all([
        reportService.getDailySales(today),
        reportService.getInventory(),
        reportService.getTopProducts(5),
        billService.getAll(1, 10),
        reportService.getRepeatedCustomers(threeMonthsAgo, today, 2),
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
      setTopRepeatCustomers(rcRes.data.data.slice(0, 8));

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

      {/* Top Repeat Customers */}
      {topRepeatCustomers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-primary" />
              Top Repeat Customers
              <span className="ml-auto text-xs font-normal text-muted-foreground">Last 3 months · sorted by visits</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-5">#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="text-center">Visits</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Avg Bill</TableHead>
                  <TableHead className="text-right pr-5">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRepeatCustomers.map((c, i) => (
                  <TableRow key={c.customerId} className="text-sm">
                    <TableCell className="pl-5 text-muted-foreground font-medium">{i + 1}</TableCell>
                    <TableCell className="font-medium">{c.customerName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.phone}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{c.totalBills}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(c.totalSales)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(c.abv)}</TableCell>
                    <TableCell className="text-right pr-5">
                      {c.currentPoints > 0 ? (
                        <span className="text-green-700 font-medium">{c.currentPoints}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Bills */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Bills</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
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
