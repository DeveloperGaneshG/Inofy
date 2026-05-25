import { api } from '@/lib/axios';
import { ApiResponse, DailySalesReport, MonthlySalesReport, TopProduct, RevenueReport, InventoryReport, RepeatedCustomer } from '@/types';

export const reportService = {
  getDailySales: (date?: string) =>
    api.get<ApiResponse<DailySalesReport>>(`/reports/sales/daily${date ? `?date=${date}` : ''}`),

  getMonthlySales: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.set('month', String(month));
    if (year) params.set('year', String(year));
    return api.get<ApiResponse<MonthlySalesReport>>(`/reports/sales/monthly?${params}`);
  },

  getTopProducts: (limit = 10) =>
    api.get<ApiResponse<TopProduct[]>>(`/reports/top-products?limit=${limit}`),

  getRevenue: (from: string, to: string) =>
    api.get<ApiResponse<RevenueReport>>(`/reports/revenue?from=${from}&to=${to}`),

  getInventory: () => api.get<ApiResponse<InventoryReport>>('/reports/inventory'),

  getRepeatedCustomers: (from: string, to: string, minBills = 2) =>
    api.get<ApiResponse<RepeatedCustomer[]>>(`/reports/repeated-customers?from=${from}&to=${to}&minBills=${minBills}`),
};
