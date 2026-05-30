import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Star } from 'lucide-react';
import { Customer } from '@/types';
import { customerService, CustomerPayload } from '@/services/customerService';
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
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try { setCustomers((await customerService.getAll()).data.data); }
    finally { setLoading(false); }
  };

  const openForm = (c?: Customer) => {
    setEditing(c || null);
    reset(c ? { name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '' } : {});
    setServerError('');
    setFormOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      const payload: CustomerPayload = { name: data.name, phone: data.phone || undefined, email: data.email || undefined, address: data.address || undefined };
      if (editing) await customerService.update(editing.id, payload);
      else await customerService.create(payload);
      setFormOpen(false);
      loadCustomers();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to save customer');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await customerService.delete(deleteTarget.id);
    setDeleteTarget(null);
    loadCustomers();
  };

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length >= 2) {
      const res = await customerService.search(q);
      setCustomers(res.data.data);
    } else if (q === '') {
      loadCustomers();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} customers</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search by name or phone…" value={search} onChange={(e) => handleSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">Loading…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm">{c.phone ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.email ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-sm font-medium">{c.loyaltyPoints}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateShort(c.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openForm(c)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No customers found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input {...register('name')} placeholder="Full name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input {...register('phone')} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...register('email')} placeholder="customer@email.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input {...register('address')} placeholder="Street, City" />
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
            <h3 className="font-semibold">Delete Customer?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.</p>
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
