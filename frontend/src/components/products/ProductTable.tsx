import { Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export default function ProductTable({ products, onEdit, onDelete }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">MRP</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">GST%</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Added</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const isLowStock = product.stock > 0 && product.stock < product.lowStockAlert;
          const isOutOfStock = product.stock === 0;
          return (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-9 w-9 rounded-md object-cover" />
                    ) : (
                      product.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    {product.barcode && <p className="text-xs text-muted-foreground">{product.barcode}</p>}
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">{product.sku}</TableCell>
              <TableCell className="text-sm">{product.category?.name ?? '—'}</TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {product.mrp ? formatCurrency(Number(product.mrp)) : '—'}
              </TableCell>
              <TableCell className="text-right font-medium">
                <div>{formatCurrency(Number(product.price))}</div>
                {product.mrp && Number(product.mrp) > Number(product.price) && (
                  <div className="text-[10px] text-green-600 font-normal">
                    {Math.round(((Number(product.mrp) - Number(product.price)) / Number(product.mrp)) * 100)}% off
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {Number(product.gstRate ?? 18)}%
              </TableCell>
              <TableCell className="text-right">
                <span className={`font-medium ${isOutOfStock ? 'text-destructive' : isLowStock ? 'text-yellow-600' : ''}`}>
                  {product.stock}
                </span>
                {isLowStock && <AlertTriangle className="ml-1 inline h-3 w-3 text-yellow-500" />}
              </TableCell>
              <TableCell>
                {isOutOfStock ? (
                  <Badge variant="destructive">Out of Stock</Badge>
                ) : isLowStock ? (
                  <Badge variant="warning">Low Stock</Badge>
                ) : !product.isActive ? (
                  <Badge variant="secondary">Inactive</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDateShort(product.createdAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => onEdit(product)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(product)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
