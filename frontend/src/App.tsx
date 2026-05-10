import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import POS from '@/pages/POS';
import Products from '@/pages/Products';
import Customers from '@/pages/Customers';
import Invoices from '@/pages/Invoices';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import Suppliers from '@/pages/Suppliers';
import Purchases from '@/pages/Purchases';
import CreditBook from '@/pages/CreditBook';
import ExpiryTracker from '@/pages/ExpiryTracker';
import InventoryAdjustments from '@/pages/InventoryAdjustments';
import AuditLogs from '@/pages/AuditLogs';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/credit-book" element={<CreditBook />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/expiry" element={<ExpiryTracker />} />
            <Route path="/inventory-adjustments" element={<InventoryAdjustments />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
