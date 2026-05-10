import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Product, Category } from '@/types';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const UNIT_TYPES = ['PCS', 'KG', 'G', 'L', 'ML', 'BOX', 'DOZEN', 'PACK'];

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  mrp: z.coerce.number().min(0).optional().or(z.literal('')).transform(v => v === '' ? undefined : Number(v) || undefined),
  price: z.coerce.number().min(0.01, 'Price must be > 0'),
  costPrice: z.coerce.number().min(0, 'Cost price required'),
  gstRate: z.coerce.number().default(18),
  stock: z.coerce.number().min(0, 'Stock must be ≥ 0'),
  lowStockAlert: z.coerce.number().int().min(1).default(10),
  categoryId: z.string().min(1, 'Category is required'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  unitType: z.string().default('PCS'),
  allowDecimalQty: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  product?: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductForm({ open, product, onClose, onSaved }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { lowStockAlert: 10, isActive: true, stock: 0, gstRate: 18, unitType: 'PCS', allowDecimalQty: false },
  });

  useEffect(() => {
    categoryService.getAll().then((r) => setCategories(r.data.data));
  }, []);

  useEffect(() => {
    if (open) {
      setServerError('');
      reset(
        product
          ? {
              name: product.name,
              sku: product.sku,
              barcode: product.barcode || '',
              mrp: product.mrp ? Number(product.mrp) : undefined,
              price: Number(product.price),
              costPrice: Number(product.costPrice),
              gstRate: Number(product.gstRate ?? 18),
              stock: product.stock,
              lowStockAlert: product.lowStockAlert,
              categoryId: product.categoryId,
              imageUrl: product.imageUrl || '',
              isActive: product.isActive,
              unitType: product.unitType || 'PCS',
              allowDecimalQty: product.allowDecimalQty ?? false,
            }
          : { lowStockAlert: 10, isActive: true, stock: 0, unitType: 'PCS', allowDecimalQty: false },
      );
    }
  }, [open, product, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setServerError('');
    try {
      const payload = { ...data, imageUrl: data.imageUrl || undefined };
      if (isEditing) {
        await productService.update(product!.id, payload);
      } else {
        await productService.create(payload as any);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label>Name *</Label>
              <Input {...register('name')} placeholder="Product name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>SKU *</Label>
              <Input {...register('sku')} placeholder="PRD-001" />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Barcode</Label>
              <Input {...register('barcode')} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label>MRP (₹)</Label>
              <Input type="number" step="0.01" {...register('mrp')} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label>Selling Price (₹) *</Label>
              <Input type="number" step="0.01" {...register('price')} placeholder="0.00" />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Cost Price (₹) *</Label>
              <Input type="number" step="0.01" {...register('costPrice')} placeholder="0.00" />
              {errors.costPrice && <p className="text-xs text-destructive">{errors.costPrice.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Stock *</Label>
              <Input type="number" step="0.001" {...register('stock')} placeholder="0" />
              {errors.stock && <p className="text-xs text-destructive">{errors.stock.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Low Stock Alert</Label>
              <Input type="number" {...register('lowStockAlert')} placeholder="10" />
            </div>
            <div className="space-y-1">
              <Label>GST Rate *</Label>
              <select
                {...register('gstRate')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {[0, 5, 12, 18, 28].map((r) => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Category *</Label>
              <select
                {...register('categoryId')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Image URL</Label>
              <Input {...register('imageUrl')} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label>Unit Type</Label>
              <select
                {...register('unitType')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {UNIT_TYPES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="allowDecimalQty" {...register('allowDecimalQty')} className="h-4 w-4" />
              <Label htmlFor="allowDecimalQty">Allow decimal qty (kg/g/L)</Label>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="isActive" {...register('isActive')} className="h-4 w-4" />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
