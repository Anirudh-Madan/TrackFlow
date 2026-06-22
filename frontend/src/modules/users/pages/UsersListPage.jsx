import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getUsers, createUser } from '../../../api/endpoints/users.api'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import { Plus, Search, User as UserIcon, Phone, Shield, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  role_name: z.enum(['admin', 'sales_manager', 'inventory_manager', 'dispatch_worker'], {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  login_id: z.string().min(2, 'Login ID must be at least 2 characters').max(50, 'Login ID must be under 50 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
})

const ROLE_LABELS = {
  admin: 'Admin',
  sales_manager: 'Sales Manager',
  inventory_manager: 'Inventory Manager',
  dispatch_worker: 'Dispatch Worker',
}

const ROLE_PREFIXES = {
  admin: 'admin_',
  sales_manager: 'sm_',
  inventory_manager: 'im_',
  dispatch_worker: 'dw_',
}

export default function UsersListPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const { register, handleSubmit, setValue, getValues, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      role_name: 'sales_manager',
      login_id: 'sm_',
      password: '',
      phone: '',
    },
  })

  // Watch the role select field to dynamically update prefix
  const selectedRole = watch('role_name')

  // Effect to handle prefix updates when the role is changed
  useEffect(() => {
    if (!selectedRole) return
    const prefix = ROLE_PREFIXES[selectedRole] || ''
    const currentLoginId = getValues('login_id') || ''
    
    // Check if the current value already has any role prefix
    const hasExistingPrefix = /^(admin_|sm_|im_|dw_)/.test(currentLoginId)
    
    if (hasExistingPrefix) {
      // Replace existing prefix with the new one, keeping whatever suffix they typed
      const suffix = currentLoginId.replace(/^(admin_|sm_|im_|dw_)/, '')
      setValue('login_id', prefix + suffix)
    } else {
      // Just append the prefix
      setValue('login_id', prefix + currentLoginId)
    }
  }, [selectedRole, setValue, getValues])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await getUsers()
      if (res.success) {
        setUsers(res.data)
      } else {
        toast.error(res.error || 'Failed to load users')
      }
    } catch (err) {
      toast.error(err.message || 'Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleOpenModal = () => {
    reset({
      name: '',
      role_name: 'sales_manager',
      login_id: 'sm_',
      password: '',
      phone: '',
    })
    setSubmitError(null)
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const onSubmit = async (data) => {
    setSubmitError(null)
    try {
      const res = await createUser(data)
      if (res.success) {
        toast.success('User created successfully!')
        setIsModalOpen(false)
        fetchUsers()
      } else {
        setSubmitError(res.error || 'Failed to create user')
      }
    } catch (err) {
      setSubmitError(err.message || 'Error creating user')
    }
  }

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.login_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            Users Management
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Create, manage, and view login histories of your TrackFlow enterprise users.
          </p>
        </div>
        <Button
          onClick={handleOpenModal}
          icon={Plus}
          size="md"
          id="create-user-btn"
          className="w-full sm:w-auto"
        >
          Create User
        </Button>
      </div>

      {/* Main Table Card */}
      <div className="card overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or login ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-base pl-9 py-1.5"
              id="user-search-input"
            />
          </div>
          <div className="text-xs text-surface-500 font-medium">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              <div className="h-6 bg-surface-200 dark:bg-surface-700 animate-pulse rounded w-1/3"></div>
              <div className="h-20 bg-surface-100 dark:bg-surface-800 animate-pulse rounded"></div>
              <div className="h-20 bg-surface-100 dark:bg-surface-800 animate-pulse rounded"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <UserIcon className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600 mb-3" />
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No users found</h3>
              <p className="text-xs text-surface-500 mt-1">Try adjusting your search criteria or create a new user.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Last Active</th>
                  <th className="px-6 py-3.5">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="table-row-hover">
                    {/* User info */}
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs">
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-surface-900 dark:text-surface-50">{user.name}</div>
                        <div className="text-xs text-surface-500 font-mono">{user.login_id}</div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                        user.role?.name === 'admin' && 'bg-danger-50 text-danger-700 border-danger-100 dark:bg-danger-900/20 dark:text-danger-400 dark:border-danger-900/50',
                        user.role?.name === 'sales_manager' && 'bg-primary-50 text-primary-700 border-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-900/50',
                        user.role?.name === 'inventory_manager' && 'bg-success-50 text-success-700 border-success-100 dark:bg-success-900/20 dark:text-success-400 dark:border-success-900/50',
                        user.role?.name === 'dispatch_worker' && 'bg-warning-50 text-warning-700 border-warning-100 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-900/50'
                      )}>
                        {ROLE_LABELS[user.role?.name] || user.role?.display_name}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4 font-medium">
                      {user.phone || <span className="text-surface-400">-</span>}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-xs">
                        <span className={cn('status-dot', user.is_active ? 'bg-success-500' : 'bg-surface-400')}></span>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Last Active */}
                    <td className="px-6 py-4 text-xs font-medium text-surface-500 dark:text-surface-400">
                      {user.last_active_at ? new Date(user.last_active_at).toLocaleString() : 'Never'}
                    </td>

                    {/* Created At */}
                    <td className="px-6 py-4 text-xs font-medium text-surface-500 dark:text-surface-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New User"
        description="Add a new system user with credentials. Login ID prefix updates based on role selection."
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {submitError && (
            <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          {/* Full Name */}
          <Input
            {...register('name')}
            label="Full Name"
            placeholder="e.g. Ramesh Kumar"
            required
            error={errors.name?.message}
            icon={UserIcon}
            id="user-create-name"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Role Select */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-create-role" className="text-xs font-medium text-surface-700 dark:text-surface-300">
                System Role <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <select
                  {...register('role_name')}
                  id="user-create-role"
                  className={cn(
                    'input-base pl-9 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em]',
                    'bg-[url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")]',
                    errors.role_name && 'border-danger-500 focus:ring-danger-500'
                  )}
                >
                  <option value="sales_manager">Sales Manager (sm_)</option>
                  <option value="inventory_manager">Inventory Manager (im_)</option>
                  <option value="dispatch_worker">Dispatch Worker (dw_)</option>
                  <option value="admin">Administrator (admin_)</option>
                </select>
              </div>
              {errors.role_name && <p className="text-xs text-danger-600 mt-1">{errors.role_name.message}</p>}
            </div>

            {/* Login ID */}
            <Input
              {...register('login_id')}
              label="Login ID"
              placeholder="e.g. sm_ramesh"
              required
              error={errors.login_id?.message}
              id="user-create-login-id"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div className="relative flex flex-col gap-1.5">
              <label htmlFor="user-create-password" className="text-xs font-medium text-surface-700 dark:text-surface-300">
                Initial Password <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  id="user-create-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={cn('input-base pr-10', errors.password && 'border-danger-500 focus:ring-danger-500')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  id="user-password-toggle-btn"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger-600 mt-1">{errors.password.message}</p>}
            </div>

            {/* Phone */}
            <Input
              {...register('phone')}
              label="Phone Number"
              placeholder="e.g. +91 9876543210"
              error={errors.phone?.message}
              icon={Phone}
              id="user-create-phone"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              id="modal-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              id="modal-submit-btn"
            >
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
