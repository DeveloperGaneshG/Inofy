import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

interface Props {
  item: CartItemType;
}

export default function CartItem({ item }: Props) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <div className="flex items-center gap-2 border-b py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{item.product.name}</p>
        <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          className="flex h-5 w-5 items-center justify-center rounded border text-xs hover:bg-muted"
          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
        >
          <Minus className="h-2.5 w-2.5" />
        </button>
        <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
        <button
          className="flex h-5 w-5 items-center justify-center rounded border text-xs hover:bg-muted"
          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
          disabled={item.quantity >= item.product.stock}
        >
          <Plus className="h-2.5 w-2.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="w-16 text-right text-xs font-semibold">{formatCurrency(item.totalPrice)}</span>
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={() => removeItem(item.product.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
