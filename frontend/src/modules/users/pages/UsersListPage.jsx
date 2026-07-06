import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getUsers, createUser, updateUser, deleteUser, getRegions, createRegion } from '../../../api/endpoints/users.api'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import {
  Plus, Search, User as UserIcon, Phone, Shield, Eye, EyeOff,
  AlertCircle, Pencil, Trash2, MapPin, X, ShieldCheck,
  Lock, CheckCircle2, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const createSchema = z.object({
  name:       z.string().min(1, 'Name is required').max(100),
  role_name:  z.enum(['admin', 'sales_manager', 'inventory_manager', 'dispatch_worker'], {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  login_id:   z.string().min(2, 'Login ID must be at least 2 characters').max(50),
  password:   z.string().min(6, 'Password must be at least 6 characters'),
  phone:      z.string().optional(),
  region_id:  z.string().optional(),
  new_region: z.string().optional(),
})

const editSchema = z.object({
  name:       z.string().min(1, 'Name is required').max(100),
  phone:      z.string().optional(),
  region_id:  z.string().optional(),
  new_region: z.string().optional(),
  is_active:  z.boolean().optional(),
})

const ROLE_LABELS = {
  admin:               'Admin',
  sales_manager:       'Sales Manager',
  inventory_manager:   'Inventory Manager',
  dispatch_worker:     'Dispatch Worker',
}

const ROLE_PREFIXES = {
  admin:               'admin_',
  sales_manager:       'sm_',
  inventory_manager:   'im_',
  dispatch_worker:     'dw_',
}

const ROLE_COLORS = {
  admin:               'bg-danger-50 text-danger-700 border-danger-100 dark:bg-danger-900/20 dark:text-danger-400 dark:border-danger-900/50',
  sales_manager:       'bg-primary-50 text-primary-700 border-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-900/50',
  inventory_manager:   'bg-success-50 text-success-700 border-success-100 dark:bg-success-900/20 dark:text-success-400 dark:border-success-900/50',
  dispatch_worker:     'bg-warning-50 text-warning-700 border-warning-100 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-900/50',
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

// ─── Inline Region Picker ─────────────────────────────────────────────────────
function RegionPicker({ regions, value, onChange, onNewRegionChange, newRegion }) {
  const [showNew, setShowNew] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5 text-surface-400" />
        Region <span className="text-surface-400 text-xs">(optional)</span>
      </label>
      {!showNew ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              className={`input-base appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`}
              id="user-region-select"
            >
              <option value="">— No Region —</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="shrink-0 h-[38px] px-3 text-xs font-medium rounded-lg border border-surface-300 dark:border-surface-600 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center gap-1"
            id="add-new-region-btn"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={newRegion || ''}
            onChange={e => onNewRegionChange(e.target.value)}
            placeholder="e.g. South UP"
            className="input-base flex-1"
            id="new-region-name-input"
            autoFocus
          />
          <button
            type="button"
            onClick={() => { setShowNew(false); onNewRegionChange(''); onChange('') }}
            className="shrink-0 h-[38px] w-[38px] flex items-center justify-center rounded-lg border border-surface-300 dark:border-surface-600 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {showNew && <p className="text-xs text-primary-600 dark:text-primary-400">A new region will be created and assigned automatically.</p>}
    </div>
  )
}

// ─── Roles Tab Content ────────────────────────────────────────────────────────
const SYSTEM_ROLES = [
  {
    name: 'admin',
    display: 'Administrator',
    color: ROLE_COLORS.admin,
    description: 'Full system access. Can manage users, products, inventory, orders, and all configurations.',
    permissions: ['Manage users & roles', 'Configure products & pricing', 'Approve & flag orders', 'View all reports & audit logs', 'Manage inventory adjustments'],
  },
  {
    name: 'sales_manager',
    display: 'Sales Manager',
    color: ROLE_COLORS.sales_manager,
    description: 'Creates and manages sales orders on behalf of assigned customer accounts.',
    permissions: ['Create & submit orders', 'View assigned parties & credit limits', 'Record payments', 'Track own order history', 'Access rate cards'],
  },
  {
    name: 'inventory_manager',
    display: 'Inventory Manager',
    color: ROLE_COLORS.inventory_manager,
    description: 'Controls stock levels, approves orders, and manages all inward/outward movements.',
    permissions: ['View & update stock levels', 'Approve & flag orders', 'Record damage & adjustments', 'Manage inward entries', 'Generate challans'],
  },
  {
    name: 'dispatch_worker',
    display: 'Dispatch Worker',
    color: ROLE_COLORS.dispatch_worker,
    description: 'Handles physical dispatch picking and marks items as dispatched.',
    permissions: ['View assigned dispatch queue', 'Mark items as picked', 'Confirm dispatch completion', 'View challan details'],
  },
]

function RolesTab() {
  return (
    <div className="space-y-6 py-2">
      <div>
        <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
          Roles & Permissions
        </h2>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          TrackFlow uses 4 fixed system roles. Each role has a predefined permission set that cannot be modified.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SYSTEM_ROLES.map(role => (
          <div key={role.name} className="card p-5 space-y-3 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', role.color.split(' ').slice(0,2).join(' '))}>
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', role.color)}>
                  {role.display}
                </span>
              </div>
              <span className="ml-auto font-mono text-xs text-surface-400 bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded">
                {ROLE_PREFIXES[role.name] || ''}*
              </span>
            </div>

            <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
              {role.description}
            </p>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Permissions
              </p>
              {role.permissions.map(perm => (
                <div key={perm} className="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-500 shrink-0" />
                  {perm}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 text-xs text-surface-500">
        <Shield className="h-4 w-4 text-surface-400 shrink-0 mt-0.5" />
        Role permissions are fixed at the system level. To grant additional access, assign a user a higher-privilege role.
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersListPage() {
  const [activeTab,    setActiveTab]    = useState('users')
  const [users,        setUsers]        = useState([])
  const [regions,      setRegions]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [searchTerm,   setSearchTerm]   = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen,   setIsEditOpen]   = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [activeUser,   setActiveUser]   = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [submitError,  setSubmitError]  = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  const createForm = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', role_name: 'sales_manager', login_id: 'sm_', password: '', phone: '', region_id: '', new_region: '' },
  })
  const selectedRole   = createForm.watch('role_name')
  const newRegionCreate = createForm.watch('new_region')
  const regionIdCreate  = createForm.watch('region_id')

  useEffect(() => {
    if (!selectedRole) return
    const prefix = ROLE_PREFIXES[selectedRole] || ''
    const cur = createForm.getValues('login_id') || ''
    const hasPrefix = /^(admin_|sm_|im_|dw_)/.test(cur)
    if (hasPrefix) {
      createForm.setValue('login_id', prefix + cur.replace(/^(admin_|sm_|im_|dw_)/, ''))
    } else {
      createForm.setValue('login_id', prefix + cur)
    }
  }, [selectedRole])

  const editForm = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', phone: '', region_id: '', new_region: '', is_active: true },
  })
  const newRegionEdit = editForm.watch('new_region')
  const regionIdEdit  = editForm.watch('region_id')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [usersRes, regionsRes] = await Promise.all([getUsers(), getRegions()])
      if (usersRes.success) setUsers(usersRes.data)
      if (regionsRes.success) setRegions(regionsRes.data)
    } catch (err) {
      toast.error(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchAll() }, [])

  const openCreate = () => {
    createForm.reset({ name: '', role_name: 'sales_manager', login_id: 'sm_', password: '', phone: '', region_id: '', new_region: '' })
    setSubmitError(null)
    setShowPassword(false)
    setIsCreateOpen(true)
  }

  const onCreateSubmit = async (data) => {
    setSubmitError(null)
    try {
      let region_id = data.region_id || null
      if (data.new_region?.trim()) {
        const rRes = await createRegion({ name: data.new_region.trim() })
        if (!rRes.success) { setSubmitError(rRes.error || 'Failed to create region'); return }
        region_id = rRes.data.id
        setRegions(prev => [...prev, rRes.data])
      }
      const res = await createUser({ ...data, region_id })
      if (res.success) {
        toast.success('User created successfully!')
        setIsCreateOpen(false)
        fetchAll()
      } else {
        setSubmitError(res.error || 'Failed to create user')
      }
    } catch (err) {
      setSubmitError(err.message || 'Error creating user')
    }
  }

  const openEdit = (user) => {
    setActiveUser(user)
    editForm.reset({
      name: user.name, phone: user.phone || '',
      region_id: user.region_id ? String(user.region_id) : '',
      new_region: '', is_active: user.is_active,
    })
    setSubmitError(null)
    setIsEditOpen(true)
  }

  const onEditSubmit = async (data) => {
    setSubmitError(null)
    try {
      let region_id = data.region_id || null
      if (data.new_region?.trim()) {
        const rRes = await createRegion({ name: data.new_region.trim() })
        if (!rRes.success) { setSubmitError(rRes.error || 'Failed to create region'); return }
        region_id = rRes.data.id
        setRegions(prev => [...prev, rRes.data])
      }
      const res = await updateUser(activeUser.id, { name: data.name, phone: data.phone, region_id, is_active: data.is_active })
      if (res.success) {
        toast.success('User updated successfully!')
        setIsEditOpen(false)
        fetchAll()
      } else {
        setSubmitError(res.error || 'Failed to update user')
      }
    } catch (err) {
      setSubmitError(err.message || 'Error updating user')
    }
  }

  const openDelete = (user) => { setActiveUser(user); setIsDeleteOpen(true) }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      const res = await deleteUser(activeUser.id)
      if (res.success) {
        toast.success(`User "${activeUser.name}" deleted.`)
        setIsDeleteOpen(false)
        fetchAll()
      } else {
        toast.error(res.error || 'Failed to delete user')
      }
    } catch (err) {
      toast.error(err.message || 'Error deleting user')
    } finally {
      setDeleting(false)
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.login_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto animate-in space-y-6">

      {/* ── Tabs (Parties-style) ──────────────────────────────────────── */}
      <div className="flex border-b border-surface-200 dark:border-surface-700 gap-6">
        <button
          onClick={() => { setActiveTab('users'); setSearchTerm('') }}
          className={cn(
            'pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2',
            activeTab === 'users'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
          )}
          id="users-tab"
        >
          <Users className="h-4 w-4" />
          Users
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={cn(
            'pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2',
            activeTab === 'roles'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
          )}
          id="roles-tab"
        >
          <ShieldCheck className="h-4 w-4" />
          Roles
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* USERS TAB                                                       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
                Users Management
              </h1>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                Create, edit, and manage TrackFlow enterprise users.
              </p>
            </div>
            <Button onClick={openCreate} icon={Plus} size="md" id="create-user-btn" className="w-full sm:w-auto">
              Create User
            </Button>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or login ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="input-base pl-9 py-1.5"
                  id="user-search-input"
                />
              </div>
              <div className="text-xs text-surface-500 font-medium">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 space-y-4">
                  <div className="h-6 bg-surface-200 dark:bg-surface-700 animate-pulse rounded w-1/3" />
                  <div className="h-20 bg-surface-100 dark:bg-surface-800 animate-pulse rounded" />
                  <div className="h-20 bg-surface-100 dark:bg-surface-800 animate-pulse rounded" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <UserIcon className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600 mb-3" />
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No users found</h3>
                  <p className="text-xs text-surface-500 mt-1">Try adjusting your search or create a new user.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      <th className="px-6 py-3.5">User</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Phone</th>
                      <th className="px-6 py-3.5">Region</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Last Active</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="table-row-hover">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-surface-900 dark:text-surface-50">{user.name}</div>
                            <div className="text-xs text-surface-500 font-mono">{user.login_id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', ROLE_COLORS[user.role?.name])}>
                            {ROLE_LABELS[user.role?.name] || user.role?.display_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {user.phone || <span className="text-surface-400">—</span>}
                        </td>
                        <td className="px-6 py-4 text-xs text-surface-500">
                          {user.region?.name
                            ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{user.region.name}</span>
                            : <span className="text-surface-400">—</span>
                          }
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 font-medium text-xs">
                            <span className={cn('status-dot', user.is_active ? 'bg-success-500' : 'bg-surface-400')} />
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-surface-500 dark:text-surface-400">
                          {user.last_active_at ? new Date(user.last_active_at).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors" title="Edit user" id={`edit-user-${user.id}`}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => openDelete(user)} className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors" title="Delete user" id={`delete-user-${user.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ROLES TAB                                                       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'roles' && <RolesTab />}

      {/* ── Create User Modal ────────────────────────────────────────── */}
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New User" description="Add a new system user with credentials. Login ID prefix updates with role selection." size="md">
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4" noValidate>
          {submitError && (
            <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />{submitError}
            </div>
          )}
          <Input {...createForm.register('name')} label="Full Name" placeholder="e.g. Ramesh Kumar" required error={createForm.formState.errors.name?.message} icon={UserIcon} id="user-create-name" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-create-role" className="text-xs font-medium text-surface-700 dark:text-surface-300">System Role <span className="text-danger-500">*</span></label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <select
                  {...createForm.register('role_name')}
                  id="user-create-role"
                  className={`input-base pl-9 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`}
                >
                  <option value="sales_manager">Sales Manager (sm_)</option>
                  <option value="inventory_manager">Inventory Manager (im_)</option>
                  <option value="dispatch_worker">Dispatch Worker (dw_)</option>
                  <option value="admin">Administrator (admin_)</option>
                </select>
              </div>
              {createForm.formState.errors.role_name && <p className="text-xs text-danger-600">{createForm.formState.errors.role_name.message}</p>}
            </div>
            <Input {...createForm.register('login_id')} label="Login ID" placeholder="e.g. sm_ramesh" required error={createForm.formState.errors.login_id?.message} id="user-create-login-id" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative flex flex-col gap-1.5">
              <label htmlFor="user-create-password" className="text-xs font-medium text-surface-700 dark:text-surface-300">Initial Password <span className="text-danger-500">*</span></label>
              <div className="relative">
                <input
                  {...createForm.register('password')}
                  id="user-create-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={cn('input-base pr-10', createForm.formState.errors.password && 'border-danger-500 focus:ring-danger-500')}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors" id="user-password-toggle-btn">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {createForm.formState.errors.password && <p className="text-xs text-danger-600">{createForm.formState.errors.password.message}</p>}
            </div>
            <Input {...createForm.register('phone')} label="Phone Number" placeholder="e.g. +91 9876543210" error={createForm.formState.errors.phone?.message} icon={Phone} id="user-create-phone" />
          </div>
          <RegionPicker regions={regions} value={regionIdCreate} onChange={v => createForm.setValue('region_id', v)} newRegion={newRegionCreate} onNewRegionChange={v => { createForm.setValue('new_region', v); if (v) createForm.setValue('region_id', '') }} />
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={createForm.formState.isSubmitting} id="modal-cancel-btn">Cancel</Button>
            <Button type="submit" loading={createForm.formState.isSubmitting} id="modal-submit-btn">Create User</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit User Modal ──────────────────────────────────────────── */}
      <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit User: ${activeUser?.name}`} description="Update user details. Role and login ID cannot be changed." size="md">
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4" noValidate>
          {submitError && (
            <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />{submitError}
            </div>
          )}
          <Input {...editForm.register('name')} label="Full Name" placeholder="e.g. Ramesh Kumar" required error={editForm.formState.errors.name?.message} icon={UserIcon} id="user-edit-name" />
          <Input {...editForm.register('phone')} label="Phone Number" placeholder="e.g. +91 9876543210" error={editForm.formState.errors.phone?.message} icon={Phone} id="user-edit-phone" />
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700">
            <div className="flex-1">
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">Account Status</p>
              <p className="text-xs text-surface-500">Inactive users cannot log in.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer" htmlFor="user-edit-active-toggle">
              <input type="checkbox" id="user-edit-active-toggle" {...editForm.register('is_active')} className="sr-only peer" />
              <div className="w-10 h-5 bg-surface-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all dark:bg-surface-600" />
            </label>
          </div>
          <RegionPicker regions={regions} value={regionIdEdit} onChange={v => editForm.setValue('region_id', v)} newRegion={newRegionEdit} onNewRegionChange={v => { editForm.setValue('new_region', v); if (v) editForm.setValue('region_id', '') }} />
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)} disabled={editForm.formState.isSubmitting} id="edit-modal-cancel-btn">Cancel</Button>
            <Button type="submit" loading={editForm.formState.isSubmitting} id="edit-modal-submit-btn">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Modal ─────────────────────────────────────────────── */}
      <Modal open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete User" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-300">
            Are you sure you want to delete <strong className="text-surface-900 dark:text-surface-50">{activeUser?.name}</strong>?
            This action cannot be undone and will remove all session data for this user.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteOpen(false)} disabled={deleting} id="delete-cancel-btn">Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete} icon={Trash2} id="delete-confirm-btn">Delete User</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
