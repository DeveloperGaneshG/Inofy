import { useState, useEffect } from 'react';
import { Plus, Search, AlertTriangle, Tag } from 'lucide-react';
import { Product, Category } from '@/types';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import ProductTable from '@/components/products/ProductTable';
import ProductForm from '@/components/products/ProductForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { printProductLabels } from '@/lib/printLabels';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [labelTarget, setLabelTarget] = useState<Product | null>(null);
  const [labelCopies, setLabelCopies] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([productService.getAll(), categoryService.getAll()]);
      setProducts(pRes.data.data);
      setCategories(cRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await productService.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch {}
  };

  const handlePrintLabel = (product: Product) => {
    setLabelCopies(1);
    setLabelTarget(product);
  };

  const handlePrintConfirm = () => {
    if (!labelTarget) return;
    printProductLabels([labelTarget], labelCopies);
    setLabelTarget(null);
  };

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchCategory = !categoryFilter || p.categoryId === categoryFilter;
    return matchSearch && matchCategory;
  });

  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock < p.lowStockAlert).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} total products</p>
        </div>
        <div className="flex gap-2">
          {filtered.length > 0 && (
            <Button
              variant="outline"
              onClick={() => printProductLabels(filtered, 1)}
              title="Print one label per product currently shown"
            >
              <Tag className="h-4 w-4" />
              Print All Labels
            </Button>
          )}
          <Button onClick={() => { setEditingProduct(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Alert badges */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex gap-2">
          {outOfStockCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {outOfStockCount} out of stock
            </Badge>
          )}
          {lowStockCount > 0 && (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {lowStockCount} low stock
            </Badge>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by name, SKU or barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="flex h-9 w-44 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">No products found</div>
        ) : (
          <ProductTable
            products={filtered}
            onEdit={(p) => { setEditingProduct(p); setFormOpen(true); }}
            onDelete={setDeleteTarget}
            onPrintLabel={handlePrintLabel}
          />
        )}
      </div>

      <ProductForm
        open={formOpen}
        product={editingProduct}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
      />

      {/* Print Label Dialog */}
      <Dialog open={!!labelTarget} onOpenChange={(o) => { if (!o) setLabelTarget(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Print Barcode Label
            </DialogTitle>
          </DialogHeader>
          {labelTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <p className="font-medium">{labelTarget.name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {labelTarget.barcode || labelTarget.sku}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Number of copies</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={labelCopies}
                  onChange={(e) => setLabelCopies(Math.max(1, Math.min(100, Number(e.target.value))))}
                />
                <p className="text-xs text-muted-foreground">
                  Useful for labelling new stock — e.g. 50 copies for 50 units received
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabelTarget(null)}>Cancel</Button>
            <Button onClick={handlePrintConfirm}>
              <Tag className="h-4 w-4" />
              Print {labelCopies > 1 ? `${labelCopies} Labels` : 'Label'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
            <h3 className="font-semibold">Delete Product?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
