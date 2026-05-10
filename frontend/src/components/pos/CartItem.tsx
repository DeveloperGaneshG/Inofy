import { Minus, Plus, Trash2, Tag } from 'lucide-react';
import { CartItem as CartItemType } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

interface Props {
  item: CartItemType;
}

export default function CartItem({ item }: Props) {
  const { updateQuantity, removeItem, setItemDiscount } = useCartStore();
  const discountedUnit = item.unitPrice * (1 - item.discount / 100);

  return (
    <div className="border-b py-2 last:border-0">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{item.product.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.discount > 0 ? (
              <>
                <span className="line-through">{formatCurrency(item.unitPrice)}</span>
                {' '}
                <span className="text-green-600">{formatCurrency(discountedUnit)}</span>
              </>
            ) : (
              formatCurrency(item.unitPrice)
            )}{' '}
            × {item.quantity} {item.product.unitType !== 'PCS' && item.product.unitType}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="flex h-5 w-5 items-center justify-center rounded border text-xs hover:bg-muted"
            onClick={() => updateQuantity(item.product.id, item.product.allowDecimalQty ? Math.max(0, item.quantity - 0.5) : item.quantity - 1)}
          >
            <Minus className="h-2.5 w-2.5" />
          </button>
          {item.product.allowDecimalQty ? (
            <input
              type="number"
              min="0.001"
              step="0.5"
              className="w-14 rounded border bg-background px-1 text-center text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
              value={item.quantity}
              onChange={(e) => updateQuantity(item.product.id, parseFloat(e.target.value) || 0)}
            />
          ) : (
            <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
          )}
          <button
            className="flex h-5 w-5 items-center justify-center rounded border text-xs hover:bg-muted"
            onClick={() => updateQuantity(item.product.id, item.product.allowDecimalQty ? item.quantity + 0.5 : item.quantity + 1)}
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

      {/* Per-item discount input */}
      <div className="mt-1 flex items-center gap-1">
        <Tag className="h-2.5 w-2.5 text-muted-foreground" />
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          className="h-5 w-14 rounded border bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="0"
          value={item.discount || ''}
          onChange={(e) => setItemDiscount(item.product.id, parseFloat(e.target.value) || 0)}
        />
        <span className="text-xs text-muted-foreground">% off</span>
        {item.discount > 0 && (
          <span className="ml-auto text-xs text-green-600">
            −{formatCurrency(item.unitPrice * item.quantity * (item.discount / 100))}
          </span>
        )}
      </div>
    </div>
  );
}
