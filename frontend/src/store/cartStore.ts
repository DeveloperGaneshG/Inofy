import { create } from 'zustand';
import { Product, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  discountAmount: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setItemDiscount: (productId: string, discountPct: number) => void;
  clearCart: () => void;
  setDiscount: (amount: number) => void;
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getTotalAmount: () => number;
}

const calcTotal = (qty: number, price: number, disc: number) =>
  qty * price * (1 - disc / 100);

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  discountAmount: 0,

  addItem: (product, quantity = 1) => {
    const items = get().items;
    const existing = items.find((i) => i.product.id === product.id);
    if (existing) {
      const newQty = existing.quantity + quantity;
      set({
        items: items.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: newQty, totalPrice: calcTotal(newQty, i.unitPrice, i.discount) }
            : i,
        ),
      });
    } else {
      const unitPrice = Number(product.price);
      set({
        items: [
          ...items,
          { product, quantity, unitPrice, discount: 0, totalPrice: unitPrice * quantity },
        ],
      });
    }
  },

  removeItem: (productId) =>
    set({ items: get().items.filter((i) => i.product.id !== productId) }),

  updateQuantity: (productId, quantity) => {
    const rounded = Math.round(quantity * 1000) / 1000;
    if (rounded <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: rounded, totalPrice: calcTotal(rounded, i.unitPrice, i.discount) }
          : i,
      ),
    });
  },

  setItemDiscount: (productId, discountPct) => {
    const pct = Math.min(100, Math.max(0, discountPct));
    set({
      items: get().items.map((i) =>
        i.product.id === productId
          ? { ...i, discount: pct, totalPrice: calcTotal(i.quantity, i.unitPrice, pct) }
          : i,
      ),
    });
  },

  clearCart: () => set({ items: [], discountAmount: 0 }),
  setDiscount: (amount) => set({ discountAmount: amount }),

  getSubtotal: () => get().items.reduce((sum, item) => sum + item.totalPrice, 0),
  getTaxAmount: () =>
    get().items.reduce((sum, item) => {
      const rate = (item.product.gstRate ?? 18) / 100;
      return sum + item.totalPrice * rate;
    }, 0),
  getTotalAmount: () =>
    get().getSubtotal() + get().getTaxAmount() - get().discountAmount,
}));
