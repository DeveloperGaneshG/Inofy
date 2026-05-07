import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Building2, CheckCircle, XCircle } from 'lucide-react';
import { Supplier } from '@/types';
import { supplierService, SupplierPayload } from '@/services/supplierService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDateShort } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await supplierService.getAll();
      setSuppliers(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const openForm = (s?: Supplier) => {
    setEditing(s || null);
    reset(s
      ? { name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', gstNumber: s.gstNumber || '' }
      : {});
    setServerError('');
    setFormOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      const payload: SupplierPayload = {
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        gstNumber: data.gstNumber || undefined,
      };
      if (editing) await supplierService.update(editing.id, payload);
      else await supplierService.create(payload);
      setFormOpen(false);
      loadSuppliers();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to save supplier');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supplierService.delete(deleteTarget.id);
    setDeleteTarget(null);
    loadSuppliers();
  };

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length >= 2) {
      const res = await supplierService.getAll(q);
      setSuppliers(res.data.data);
    } else if (q === '') {
      loadSuppliers();
    }
  };

  const activeCount = suppliers.filter((s) => s.isActive).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-sm text-muted-foreground">{activeCount} active · {suppliers.length} total</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search by name or phone…" value={search} onChange={(e) => handleSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">Loading…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>GST Number</TableHead>
                <TableHead>Purchases</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Since</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{s.name}</p>
                        {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{s.phone ?? '—'}</TableCell>
                  <TableCell className="text-sm font-mono">{s.gstNumber ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s._count?.purchases ?? 0}</Badge>
                  </TableCell>
                  <TableCell>
                    {s.isActive ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span className="text-xs">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="h-3.5 w-3.5" />
                        <span className="text-xs">Inactive</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateShort(s.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openForm(s)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(s)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No suppliers found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input {...register('name')} placeholder="Supplier company name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input {...register('phone')} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1">
                <Label>GST Number</Label>
                <Input {...register('gstNumber')} placeholder="27XXXXX1234X1ZX" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...register('email')} placeholder="supplier@company.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input {...register('address')} placeholder="Street, City, State" />
            </div>
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
            <h3 className="font-semibold">Delete Supplier?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Delete <strong>{deleteTarget.name}</strong>?
              {(deleteTarget._count?.purchases ?? 0) > 0 && (
                <span className="text-amber-600"> This supplier has purchases — it will be deactivated instead.</span>
              )}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>
                {(deleteTarget._count?.purchases ?? 0) > 0 ? 'Deactivate' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
