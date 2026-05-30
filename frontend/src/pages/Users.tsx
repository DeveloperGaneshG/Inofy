import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Power } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Role } from '@/types';
import { userService, CreateUserDto, UpdateUserDto } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDateShort } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER'] as const),
});
type FormData = z.infer<typeof schema>;

const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Admin', MANAGER: 'Manager', CASHIER: 'Cashier' };
const ROLE_VARIANT: Record<Role, 'destructive' | 'default' | 'secondary'> = {
  ADMIN: 'destructive',
  MANAGER: 'default',
  CASHIER: 'secondary',
};

export default function Users() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setUsers((await userService.getAll()).data.data); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', email: '', password: '', role: 'CASHIER' });
    setServerError('');
    setFormOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    reset({ name: u.name, email: u.email, password: '', role: u.role });
    setServerError('');
    setFormOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    setServerError('');
    if (!editing && (!data.password || data.password.length < 6)) {
      setError('password', { message: 'Min 6 characters required' });
      return;
    }
    if (data.password && data.password.length > 0 && data.password.length < 6) {
      setError('password', { message: 'Min 6 characters' });
      return;
    }
    try {
      if (editing) {
        const dto: UpdateUserDto = { name: data.name, email: data.email, role: data.role };
        if (data.password) dto.password = data.password;
        await userService.update(editing.id, dto);
      } else {
        const dto: CreateUserDto = { name: data.name, email: data.email, password: data.password!, role: data.role };
        await userService.create(dto);
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleToggle = async (u: User) => {
    await userService.toggleActive(u.id);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await userService.remove(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      setDeleteTarget(null);
    }
  };

  if (me?.role !== 'ADMIN') {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Access restricted to administrators.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage cashiers and staff accounts</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No users found</TableCell>
              </TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
                <TableCell>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? 'default' : 'secondary'}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateShort(u.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={u.id === me?.id}
                      title={u.isActive ? 'Deactivate' : 'Activate'}
                      onClick={() => handleToggle(u)}
                    >
                      <Power className={`h-4 w-4 ${u.isActive ? 'text-green-600' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={u.id === me?.id}
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input {...register('name')} placeholder="Full name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Email</Label>
              <Input {...register('email')} placeholder="email@example.com" type="email" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>{editing ? 'New Password' : 'Password'}</Label>
              <Input
                {...register('password')}
                type="password"
                placeholder={editing ? 'Leave blank to keep current' : 'Min 6 characters'}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Role</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASHIER">Cashier</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
