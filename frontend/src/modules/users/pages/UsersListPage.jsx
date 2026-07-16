import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getUsers, createUser, updateUser, deleteUser, getRegions, createRegion } from '../../../api/endpoints/users.api'
import { getRoles, getRolePermissions, updateRolePermissions } from '../../../api/endpoints/rbac.api'
import { getMe } from '../../../api/endpoints/auth.api'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import {
  Plus, Search, User as UserIcon, Phone, Shield, Eye, EyeOff,
  AlertCircle, Pencil, Trash2, MapPin, X, ShieldCheck,
  Lock, CheckCircle2, Users, Save, AlertTriangle, RefreshCw, Info, Check, CheckSquare, Square, ChevronUp, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'
import { usePermission } from '../../../hooks/usePermission'
import { useAuthStore } from '../../../store/authStore'

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
  role_id:    z.string().optional(),
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
    id: 1,
    name: 'admin',
    display: 'Administrator',
    color: ROLE_COLORS.admin,
    description: 'Full system access. Can manage users, products, inventory, orders, and all configurations.',
    permissions: ['Manage users & roles', 'Configure products & pricing', 'Approve & flag orders', 'View all reports & audit logs', 'Manage inventory adjustments'],
  },
  {
    id: 2,
    name: 'sales_manager',
    display: 'Sales Manager',
    color: ROLE_COLORS.sales_manager,
    description: 'Creates and manages sales orders on behalf of assigned customer accounts.',
    permissions: ['Create & submit orders', 'View assigned parties & credit limits', 'Record payments', 'Track own order history', 'Access rate cards'],
  },
  {
    id: 3,
    name: 'inventory_manager',
    display: 'Inventory Manager',
    color: ROLE_COLORS.inventory_manager,
    description: 'Controls stock levels, approves orders, and manages all inward/outward movements.',
    permissions: ['View & update stock levels', 'Approve & flag orders', 'Record damage & adjustments', 'Manage inward entries', 'Generate challans'],
  },
  {
    id: 4,
    name: 'dispatch_worker',
    display: 'Dispatch Worker',
    color: ROLE_COLORS.dispatch_worker,
    description: 'Handles physical dispatch picking and marks items as dispatched.',
    permissions: ['View assigned dispatch queue', 'Mark items as picked', 'Confirm dispatch completion', 'View challan details'],
  },
]

function RolesTab() {
  const currentUser = useAuthStore((s) => s.user)
  const updatePermissions = useAuthStore((s) => s.updatePermissions)

  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // State to store current enabled permission IDs per role
  const [rolePermissionsMap, setRolePermissionsMap] = useState({})
  const [initialPermissionsMap, setInitialPermissionsMap] = useState({})
  const [allPermissions, setAllPermissions] = useState([])
  const [modulesList, setModulesList] = useState([])

  useEffect(() => {
    async function init() {
      try {
        setLoading(true)
        const rolesRes = await getRoles()
        if (!rolesRes.success || rolesRes.data.length === 0) {
          throw new Error('No roles found in system')
        }
        const rolesData = rolesRes.data
        setRoles(rolesData)

        const results = await Promise.all(
          rolesData.map(r => getRolePermissions(r.id))
        )

        const enabledMap = {}
        const initialMap = {}
        let flatPermissions = []

        results.forEach((res, index) => {
          if (!res.success) return
          const roleId = rolesData[index].id
          const enabledIds = []

          res.data.permission_groups.forEach((group) => {
            group.permissions.forEach((perm) => {
              if (index === 0) {
                flatPermissions.push({
                  id: perm.id,
                  permission_key: perm.permission_key,
                  display_name: perm.display_name,
                  description: perm.description,
                  module: group.module,
                })
              }
              if (perm.enabled) {
                enabledIds.push(perm.id)
              }
            })
          })

          enabledMap[roleId] = enabledIds
          initialMap[roleId] = [...enabledIds]
        })

        setAllPermissions(flatPermissions)
        setRolePermissionsMap(enabledMap)
        setInitialPermissionsMap(initialMap)

        const uniqueModules = Array.from(new Set(flatPermissions.map(p => p.module))).sort()
        setModulesList(uniqueModules)

      } catch (err) {
        toast.error('Failed to load RBAC data: ' + (err.message || 'Unknown error'))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const dirtyRoleIds = useMemo(() => {
    const dirty = []
    roles.forEach(r => {
      const current = [...(rolePermissionsMap[r.id] || [])].sort().toString()
      const initial = [...(initialPermissionsMap[r.id] || [])].sort().toString()
      if (current !== initial) {
        dirty.push(r.id)
      }
    })
    return dirty
  }, [rolePermissionsMap, initialPermissionsMap, roles])

  const isDirty = dirtyRoleIds.length > 0

  const handleTogglePermission = (roleId, permissionId, key) => {
    const isCurrentlyEnabled = rolePermissionsMap[roleId]?.includes(permissionId)
    const role = roles.find(r => r.id === roleId)

    if (role?.name === 'admin' && key === 'settings.manage' && isCurrentlyEnabled) {
      toast(
        (t) => (
          <span className="flex flex-col gap-1">
            <span className="font-semibold text-danger-600 flex items-center gap-1.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" /> Warning
            </span>
            <span className="text-[11px] text-surface-600 dark:text-surface-300">
              Disabling "Manage Settings & Permissions" on Admin role will revoke your ability to manage permissions.
            </span>
            <span className="flex justify-end gap-1.5 mt-1">
              <Button size="xs" variant="secondary" onClick={() => toast.dismiss(t.id)}>Cancel</Button>
              <Button size="xs" variant="danger" onClick={() => {
                toggleState(roleId, permissionId)
                toast.dismiss(t.id)
              }}>Proceed</Button>
            </span>
          </span>
        ),
        { duration: 6000 }
      )
      return
    }

    toggleState(roleId, permissionId)
  }

  const toggleState = (roleId, permissionId) => {
    setRolePermissionsMap(prev => {
      const current = prev[roleId] || []
      const updated = current.includes(permissionId)
        ? current.filter(id => id !== permissionId)
        : [...current, permissionId]
      return { ...prev, [roleId]: updated }
    })
  }

  const handleToggleRoleAll = (roleId, allActive) => {
    const role = roles.find(r => r.id === roleId)
    setRolePermissionsMap(prev => {
      if (allActive) {
        if (role?.name === 'admin') {
          const managePerm = allPermissions.find(p => p.permission_key === 'settings.manage')
          return { ...prev, [roleId]: managePerm ? [managePerm.id] : [] }
        }
        return { ...prev, [roleId]: [] }
      } else {
        return { ...prev, [roleId]: allPermissions.map(p => p.id) }
      }
    })
  }

  const handleTogglePermissionRow = (permissionId, allActive) => {
    setRolePermissionsMap(prev => {
      const updated = { ...prev }
      roles.forEach(r => {
        const perm = allPermissions.find(p => p.id === permissionId)
        if (r.name === 'admin' && perm?.permission_key === 'settings.manage' && allActive) {
          return
        }
        const current = updated[r.id] || []
        if (allActive) {
          updated[r.id] = current.filter(id => id !== permissionId)
        } else {
          if (!current.includes(permissionId)) {
            updated[r.id] = [...current, permissionId]
          }
        }
      })
      return updated
    })
  }

  const handleReset = () => {
    const resetMap = {}
    Object.keys(initialPermissionsMap).forEach(roleId => {
      resetMap[roleId] = [...initialPermissionsMap[roleId]]
    })
    setRolePermissionsMap(resetMap)
    toast.success('Permissions reset to initial state')
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await Promise.all(
        dirtyRoleIds.map(roleId => 
          updateRolePermissions(roleId, rolePermissionsMap[roleId])
        )
      )
      toast.success('Permissions saved successfully!')
      
      const nextInitial = {}
      Object.keys(rolePermissionsMap).forEach(roleId => {
        nextInitial[roleId] = [...rolePermissionsMap[roleId]]
      })
      setInitialPermissionsMap(nextInitial)

      if (currentUser && dirtyRoleIds.includes(currentUser.role_id)) {
        try {
          const meRes = await getMe()
          if (meRes.success && meRes.data.permissions) {
            updatePermissions(meRes.data.permissions)
            toast.success('Your permissions refreshed instantly.', { icon: '🔄' })
          }
        } catch (e) {
          console.error('Failed to sync permissions', e)
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  const filteredPermissionsByModule = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    const groups = {}
    allPermissions.forEach(p => {
      const match = p.display_name.toLowerCase().includes(query) ||
                    p.permission_key.toLowerCase().includes(query) ||
                    (p.description && p.description.toLowerCase().includes(query)) ||
                    p.module.toLowerCase().includes(query)
      if (match) {
        if (!groups[p.module]) groups[p.module] = []
        groups[p.module].push(p)
      }
    })
    return groups
  }, [allPermissions, searchQuery])

  return (
    <div className="space-y-6 py-2">
      {/* Tab Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-55 tracking-tight">
            Roles & Permissions Management
          </h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Manage comparative role permissions directly from the matrix.
          </p>
        </div>

        {isDirty && (
          <div className="flex items-center gap-3 animate-fade-in">
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> Unsaved changes in {dirtyRoleIds.length} role(s)
            </span>
            <Button variant="secondary" size="sm" onClick={handleReset} disabled={saving}>
              Reset
            </Button>
            <Button variant="primary" size="sm" icon={Save} onClick={handleSave} loading={saving}>
              Save Matrix
            </Button>
          </div>
        )}
      </div>

      {/* Permissions Matrix search and table */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search privileges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-base pl-9 py-1.5 text-xs bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
            />
          </div>
          <div className="text-xs text-surface-500 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-surface-400" />
            <span>Click intersection checkboxes to edit permission mapping.</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="card overflow-hidden border border-surface-200 dark:border-surface-800">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50/70 dark:bg-surface-850/80 text-[10px] font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                    <th className="px-5 py-3 sticky left-0 bg-surface-50/90 dark:bg-surface-900/90 backdrop-blur-xs z-10 w-[300px]">
                      Permission Module & Key
                    </th>
                    {roles.map((role) => {
                      const roleActivePerms = rolePermissionsMap[role.id] || []
                      const allActive = roleActivePerms.length === allPermissions.length
                      return (
                        <th key={role.id} className="px-5 py-3 text-center w-40">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-surface-900 dark:text-surface-100">
                              {role.display_name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleRoleAll(role.id, allActive)}
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-bold border transition-colors",
                                allActive
                                  ? "bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/10 dark:border-primary-900/40"
                                  : "bg-surface-100 border-surface-200 text-surface-600 dark:bg-surface-800 dark:border-surface-700 dark:text-surface-400"
                              )}
                            >
                              {allActive ? "Deselect" : "Select All"}
                            </button>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-[11px] text-surface-700 dark:text-surface-300">
                  {modulesList.map((modName) => {
                    const modulePerms = filteredPermissionsByModule[modName] || []
                    if (modulePerms.length === 0) return null

                    return (
                      <React.Fragment key={modName}>
                        <tr className="bg-surface-50/30 dark:bg-surface-900/5">
                          <td colSpan={1 + roles.length} className="px-5 py-2 font-bold uppercase tracking-wider text-[9px] text-primary-600 dark:text-primary-400 sticky left-0 z-10">
                            {modName} Module
                          </td>
                        </tr>

                        {modulePerms.map((perm) => {
                          const allEnabledForRow = roles.every(r => (rolePermissionsMap[r.id] || []).includes(perm.id))

                          return (
                            <tr key={perm.id} className="table-row-hover">
                              <td className="px-5 py-2.5 sticky left-0 bg-white dark:bg-surface-900 z-10 w-[300px] border-r border-surface-100 dark:border-surface-800/40">
                                <div className="flex items-start gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePermissionRow(perm.id, allEnabledForRow)}
                                    className={cn(
                                      "mt-0.5 p-0.5 rounded border transition-colors",
                                      allEnabledForRow
                                        ? "bg-primary-100 border-primary-300 text-primary-800 dark:bg-primary-950 dark:border-primary-800 dark:text-primary-300"
                                        : "bg-surface-55 border-surface-300 text-surface-400 dark:bg-surface-800 dark:border-surface-700"
                                    )}
                                    title={allEnabledForRow ? "Deselect for all" : "Select for all"}
                                  >
                                    <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                                  </button>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold text-surface-800 dark:text-white">
                                      {perm.display_name}
                                    </span>
                                    <span className="font-mono text-[8px] text-surface-400 dark:text-surface-500">
                                      {perm.permission_key}
                                    </span>
                                    {perm.description && (
                                      <span className="text-[9px] text-surface-500 dark:text-surface-400 font-light mt-0.5 leading-snug">
                                        {perm.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {roles.map((role) => {
                                const isEnabled = (rolePermissionsMap[role.id] || []).includes(perm.id)
                                return (
                                  <td
                                    key={role.id}
                                    onClick={() => handleTogglePermission(role.id, perm.id, perm.permission_key)}
                                    className={cn(
                                      "px-5 py-2.5 text-center cursor-pointer select-none border-r border-surface-100 dark:border-surface-800/10 last:border-r-0",
                                      isEnabled ? "bg-primary-50/5 dark:bg-primary-950/2" : ""
                                    )}
                                  >
                                    <div className="flex justify-center items-center">
                                      <button
                                        type="button"
                                        className={cn(
                                          "h-4 w-4 rounded flex items-center justify-center border transition-all duration-150",
                                          isEnabled
                                            ? "bg-primary-600 border-primary-700 text-white shadow-xs"
                                            : "bg-white border-surface-300 text-transparent dark:bg-surface-800 dark:border-surface-700"
                                        )}
                                      >
                                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                                      </button>
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersListPage() {
  const canChangeRole = usePermission('users.change_role')
  
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
    defaultValues: { name: '', phone: '', region_id: '', new_region: '', is_active: true, role_id: '' },
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
      role_id: user.role_id ? String(user.role_id) : '',
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
      
      const role_id = data.role_id ? parseInt(data.role_id) : undefined
      const res = await updateUser(activeUser.id, { 
        name: data.name, 
        phone: data.phone, 
        region_id, 
        is_active: data.is_active,
        role_id
      })
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

  const handleAssignRole = async (userId, roleId) => {
    try {
      const userToAssign = users.find(u => u.id === userId)
      if (!userToAssign) return

      const currentUser = useAuthStore.getState().user
      if (String(currentUser?.id) === String(userId)) {
        toast.error('You cannot change your own role.')
        return
      }

      const res = await updateUser(userId, {
        name: userToAssign.name,
        phone: userToAssign.phone,
        region_id: userToAssign.region_id,
        is_active: userToAssign.is_active,
        role_id: roleId
      })

      if (res.success) {
        toast.success(`User "${userToAssign.name}" role updated successfully!`)
        fetchAll()
      } else {
        toast.error(res.error || 'Failed to update user role')
      }
    } catch (err) {
      toast.error(err.message || 'Error updating user role')
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
          Roles and Permissions
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
      {activeTab === 'roles' && (
        <RolesTab />
      )}

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
      <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit User: ${activeUser?.name}`} description={canChangeRole ? "Update user details including role. Login ID cannot be changed." : "Update user details. Role and login ID cannot be changed."} size="md">
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4" noValidate>
          {submitError && (
            <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />{submitError}
            </div>
          )}
          <Input {...editForm.register('name')} label="Full Name" placeholder="e.g. Ramesh Kumar" required error={editForm.formState.errors.name?.message} icon={UserIcon} id="user-edit-name" />
          <Input {...editForm.register('phone')} label="Phone Number" placeholder="e.g. +91 9876543210" error={editForm.formState.errors.phone?.message} icon={Phone} id="user-edit-phone" />
          
          {canChangeRole ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-edit-role" className="text-xs font-medium text-surface-700 dark:text-surface-300">System Role <span className="text-danger-500">*</span></label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <select
                  {...editForm.register('role_id')}
                  id="user-edit-role"
                  className={`input-base pl-9 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")]`}
                >
                  <option value="1">Administrator (admin)</option>
                  <option value="2">Sales Manager (sales_manager)</option>
                  <option value="3">Inventory Manager (inventory_manager)</option>
                  <option value="4">Dispatch Worker (dispatch_worker)</option>
                </select>
              </div>
              {editForm.formState.errors.role_id && <p className="text-xs text-danger-600">{editForm.formState.errors.role_id.message}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 opacity-60">
              <label className="text-xs font-medium text-surface-700 dark:text-surface-300">System Role</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <input
                  type="text"
                  disabled
                  value={ROLE_LABELS[activeUser?.role?.name] || activeUser?.role?.display_name || ''}
                  className="input-base pl-9 bg-surface-100 dark:bg-surface-800"
                />
              </div>
            </div>
          )}
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
