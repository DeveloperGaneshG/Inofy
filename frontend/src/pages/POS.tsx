import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ShoppingCart, UserSearch, Trash2, Percent, ScanLine } from 'lucide-react';
import { Product, Customer } from '@/types';
import { productService } from '@/services/productService';
import { customerService } from '@/services/customerService';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils';
import ProductCard from '@/components/pos/ProductCard';
import CartItemComponent from '@/components/pos/CartItem';
import PaymentModal from '@/components/pos/PaymentModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export default function POS() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [completedBillId, setCompletedBillId] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState('');

  const { items, addItem, clearCart, setDiscount, discountAmount, getSubtotal, getTaxAmount, getTotalAmount } =
    useCartStore();

  // Auto-focus on mount + F2 refocus
  useEffect(() => {
    searchRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const loadProducts = useCallback(async (q?: string) => {
    try {
      const res = q
        ? await productService.search(q)
        : await productService.getAll();
      setProducts(res.data.data.filter((p) => p.isActive));
    } catch {}
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Continuous scan: when products update, check for exact barcode match → auto-add
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const exact = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === searchQuery.trim().toLowerCase(),
    );
    if (exact) addToCartAndReset(exact);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const addToCartAndReset = useCallback((product: Product) => {
    if (product.stock <= 0) return;
    addItem(product);
    setSearchQuery('');
    loadProducts();
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [addItem, loadProducts]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    loadProducts(q || undefined);
  }, [loadProducts]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || products.length === 0) return;
    const exact = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === searchQuery.trim().toLowerCase(),
    );
    addToCartAndReset(exact ?? products[0]);
  };

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
    setSelectedCustomer(c);
    setCustomerQuery(c.name);
    setCustomerResults([]);
    setShowCustomerSearch(false);
  };

  const handleDiscountChange = (val: string) => {
    setDiscountInput(val);
    setDiscount(parseFloat(val) || 0);
  };

  const handlePaymentSuccess = (billId: string) => {
    setPaymentOpen(false);
    setCompletedBillId(billId);
    setSelectedCustomer(null);
    setCustomerQuery('');
    setDiscountInput('');
  };

  if (completedBillId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-xl font-bold">Bill Created!</h2>
          <p className="text-muted-foreground">Bill processed successfully</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(`/invoices`)}>View Invoice</Button>
          <Button onClick={() => setCompletedBillId(null)}>New Bill (F2)</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      {/* LEFT: Product Search + Grid */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              className="pl-8 pr-20"
              placeholder="Scan barcode or search by name…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <div className="absolute right-2.5 top-2 flex items-center gap-1 text-xs text-muted-foreground">
              <ScanLine className="h-3.5 w-3.5" />
              <span>F2</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {products.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No products found
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={addItem} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="flex w-80 flex-col rounded-xl border bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="font-semibold">Cart</span>
            {items.length > 0 && (
              <Badge>{items.reduce((s, i) => s + i.quantity, 0)}</Badge>
            )}
          </div>
          {items.length > 0 && (
            <button className="text-xs text-destructive hover:underline" onClick={clearCart}>
              Clear
            </button>
          )}
        </div>

        {/* Customer Search */}
        <div className="border-b p-3">
          <div className="relative">
            <UserSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 text-xs"
              placeholder="Search customer (optional)"
              value={customerQuery}
              onFocus={() => setShowCustomerSearch(true)}
              onChange={(e) => handleCustomerSearch(e.target.value)}
            />
          </div>
          {showCustomerSearch && customerResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-72 rounded-md border bg-background shadow-lg">
              {customerResults.map((c) => (
                <button
                  key={c.id}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => selectCustomer(c)}
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.phone}</span>
                </button>
              ))}
            </div>
          )}
          {selectedCustomer && (
            <div className="mt-1.5 flex items-center justify-between rounded bg-muted px-2 py-1">
              <span className="text-xs font-medium">{selectedCustomer.name}</span>
              <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => { setSelectedCustomer(null); setCustomerQuery(''); }}>×</button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ShoppingCart className="h-8 w-8 opacity-30" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs">Scan a barcode or press Enter to add</p>
            </div>
          ) : (
            items.map((item) => <CartItemComponent key={item.product.id} item={item} />)
          )}
        </div>

        {/* Summary */}
        <div className="border-t p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(getSubtotal())}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST</span>
            <span>{formatCurrency(getTaxAmount())}</span>
          </div>
          <div className="flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-7 text-xs"
              type="number"
              min="0"
              placeholder="Discount (₹)"
              value={discountInput}
              onChange={(e) => handleDiscountChange(e.target.value)}
            />
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>- {formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Total</span>
            <span className="text-primary text-lg">{formatCurrency(getTotalAmount())}</span>
          </div>

          <Button
            className="w-full"
            disabled={items.length === 0}
            onClick={() => setPaymentOpen(true)}
          >
            Checkout
          </Button>
        </div>
      </div>

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        customer={selectedCustomer}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
