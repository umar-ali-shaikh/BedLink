import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import { Segmented } from '../../components/Segmented';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { useToast } from '../../components/Toast';
import { usersApi } from '../../features/users/api';
import { hospitalsApi } from '../../features/hospitals/api';
import { useAuth } from '../../features/auth/useAuth';
import { ROLES } from '../../constants/roles';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';
import { cn } from '../../utils/cn';

const ROLE_LABEL = { ADMIN: 'Admin', DISPATCHER: 'Dispatcher', HOSPITAL: 'Hospital staff' };
const ROLE_TONE = { ADMIN: 'text-warning bg-warning-soft', DISPATCHER: 'text-primary bg-primary-soft', HOSPITAL: 'text-success bg-success-soft' };

function UserForm({ user, hospitals, onDone }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setForm(user ? { name: user.name, email: user.email, password: '', role: user.role, hospitalId: user.hospitalId ?? '', isActive: user.isActive } : { name: '', email: '', password: '', role: 'DISPATCHER', hospitalId: '', isActive: true });
  }, [user]);

  const save = useMutation({
    mutationFn: () => {
      const hospitalId = form.role === 'HOSPITAL' ? form.hospitalId || null : null;
      if (user) {
        const body = { name: form.name.trim(), role: form.role, hospitalId, isActive: form.isActive };
        if (form.password) body.password = form.password;
        return usersApi.update(user.id, body);
      }
      return usersApi.create({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role, hospitalId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.users });
      showToast({ type: 'success', title: user ? 'User updated' : 'User created' });
      onDone();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const submit = (e) => {
    e.preventDefault();
    if ((form.name ?? '').trim().length < 2) return setError('Name must be at least 2 characters.');
    if (!user && !/^\S+@\S+\.\S+$/.test(form.email ?? '')) return setError('Enter a valid email.');
    if ((!user || form.password) && (form.password ?? '').length < 8) return setError('Password must be at least 8 characters.');
    if (form.role === 'HOSPITAL' && !form.hospitalId) return setError('Choose the hospital this user works at.');
    return save.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="u-name">
          Name
        </label>
        <input id="u-name" className="input" value={form.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="u-email">
          Email
        </label>
        <input id="u-email" type="email" className="input disabled:bg-surface-muted disabled:text-text-muted" value={form.email ?? ''} onChange={(e) => set({ email: e.target.value })} disabled={!!user} />
      </div>
      <div>
        <label className="label" htmlFor="u-password">
          {user ? 'New password (optional)' : 'Password'}
        </label>
        <input id="u-password" type="password" autoComplete="new-password" className="input" value={form.password ?? ''} onChange={(e) => set({ password: e.target.value })} placeholder="At least 8 characters" />
      </div>
      <div>
        <span className="label">Role</span>
        <Segmented label="Role" value={form.role} onChange={(role) => set({ role })} options={Object.keys(ROLE_LABEL).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
      </div>
      {form.role === 'HOSPITAL' && (
        <div>
          <label className="label" htmlFor="u-hospital">
            Hospital
          </label>
          <select id="u-hospital" className="input" value={form.hospitalId ?? ''} onChange={(e) => set({ hospitalId: e.target.value })}>
            <option value="">Select a hospital…</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {user && (
        <label className="flex items-center gap-3 text-small text-text cursor-pointer">
          <input type="checkbox" className="w-5 h-5 accent-primary" checked={!!form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
          Account active (inactive users can't sign in)
        </label>
      )}
      {error && (
        <p className="text-small text-danger bg-danger-soft rounded-md px-3 py-2" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" isLoading={save.isPending}>
        {user ? 'Save changes' : 'Create user'}
      </Button>
    </form>
  );
}

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const users = useQuery({ queryKey: qk.users, queryFn: usersApi.list });
  const hospitals = useQuery({ queryKey: qk.hospitals, queryFn: () => hospitalsApi.list() });
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('');
  const [role, setRole] = useState('ALL');
  const hospitalNames = useMemo(() => Object.fromEntries((hospitals.data ?? []).map((h) => [h.id, h.name])), [hospitals.data]);

  const rows = (users.data ?? []).filter((u) => (role === 'ALL' || u.role === role) && `${u.name} ${u.email}`.toLowerCase().includes(filter.trim().toLowerCase()));

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (u) => (
        <div className="min-w-0">
          <p className="font-semibold text-text truncate">
            {u.name} {u.id === me?.id && <span className="text-text-subtle font-normal">(you)</span>}
          </p>
          <p className="text-[12px] text-text-subtle truncate">{u.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (u) => <span className={cn('inline-flex text-[11px] font-bold uppercase tracking-wide rounded px-2 py-0.5', ROLE_TONE[u.role])}>{ROLE_LABEL[u.role]}</span> },
    { key: 'hospital', header: 'Hospital', render: (u) => <span className="text-text-muted">{u.hospitalId ? (hospitalNames[u.hospitalId] ?? '—') : '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (u) => (
        <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide', u.isActive ? 'text-success' : 'text-text-subtle')}>
          <span className={cn('w-1.5 h-1.5 rounded-full', u.isActive ? 'bg-success' : 'bg-neutral-state')} /> {u.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={`${users.data?.length ?? 0} accounts`}
        actions={
          <Button icon={Plus} onClick={() => setCreating(true)}>
            Add user
          </Button>
        }
      />
      <Card padded={false}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 pt-4 pb-3">
          <Segmented
            label="Filter by role"
            value={role}
            onChange={setRole}
            options={[{ value: 'ALL', label: 'All' }, ...Object.keys(ROLE_LABEL).map((r) => ({ value: r, label: ROLE_LABEL[r], count: (users.data ?? []).filter((u) => u.role === r).length }))]}
          />
          <label className="relative block lg:w-72">
            <span className="sr-only">Search users</span>
            <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search name or email…" className="input pl-9" />
          </label>
        </div>
        {users.isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : users.isError ? (
          <ErrorState className="m-4" message={errorMessage(users.error)} onRetry={users.refetch} />
        ) : (
          <ResponsiveTable columns={columns} rows={rows} onRowClick={setEditing} empty={<EmptyState className="m-4" title="No users match" description="Try a different search or role." />} />
        )}
      </Card>

      <Modal
        isOpen={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        variant="drawer"
        title={editing ? editing.name : 'New user'}
        description={editing ? editing.email : 'Hospital staff must be linked to a hospital.'}
      >
        <UserForm
          user={editing}
          hospitals={hospitals.data ?? []}
          onDone={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>
    </>
  );
}
