import { Plus, AlertTriangle } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Props {
  product: Product;
  onAdd: (product: Product) => void;
}

export default function ProductCard({ product, onAdd }: Props) {
  const isLowStock = product.stock > 0 && product.stock < product.lowStockAlert;
  const isOutOfStock = product.stock === 0;

  return (
    <div
      className={`relative flex flex-col rounded-lg border bg-card p-3 transition-all hover:shadow-md ${
        isOutOfStock ? 'opacity-60' : 'cursor-pointer hover:border-primary'
      }`}
      onClick={() => !isOutOfStock && onAdd(product)}
    >
      <div className="mb-2 flex h-24 items-center justify-center rounded-md bg-muted">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full rounded-md object-cover" />
        ) : (
          <span className="text-3xl">{product.name.charAt(0).toUpperCase()}</span>
        )}
      </div>

      <p className="line-clamp-2 text-xs font-medium leading-tight">{product.name}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{product.category?.name}</p>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-bold text-primary">{formatCurrency(Number(product.price))}</span>
        {!isOutOfStock && (
          <button
            className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90"
            onClick={(e) => { e.stopPropagation(); onAdd(product); }}
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="mt-1 flex items-center gap-1">
        {isOutOfStock ? (
          <Badge variant="destructive" className="text-[10px] px-1 py-0">Out of Stock</Badge>
        ) : isLowStock ? (
          <Badge variant="warning" className="flex items-center gap-0.5 text-[10px] px-1 py-0">
            <AlertTriangle className="h-2.5 w-2.5" /> Low ({product.stock})
          </Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground">Stock: {product.stock}</span>
        )}
      </div>
    </div>
  );
}
