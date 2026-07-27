import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Activity, Users, ShieldAlert, Clock, Search, Filter, RefreshCw,
  Download, Eye, Calendar, ArrowRight, UserCheck, Package, ShoppingCart,
  FileText, Shield, Key, AlertTriangle, Database
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getAuditLogs } from '../../../api/endpoints/audit.api'
import TablePagination from '../../../components/data/TablePagination'

const ROLE_BADGES = {
  admin:             { label: 'Admin',             color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/40' },
  inventory_manager: { label: 'Inventory Mgr',    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40' },
  sales_manager:     { label: 'Sales Mgr',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40' },
  dispatch_worker:   { label: 'Dispatch Worker',  color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40' },
}

const ACTION_COLORS = {
  create:        'bg-success-50 text-success-700 border-success-200 dark:bg-success-950/40 dark:text-success-300',
  approve:       'bg-success-50 text-success-700 border-success-200 dark:bg-success-950/40 dark:text-success-300',
  update:        'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-950/40 dark:text-primary-300',
  price_update:  'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300',
  delete:        'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-950/40 dark:text-danger-300',
  flag:          'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-950/40 dark:text-warning-300',
  dispatch:      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300',
  login:         'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300',
  password_reset:'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
}

const MODULE_ICONS = {
  orders: ShoppingCart,
  challans: FileText,
  products: Package,
  inward: Database,
  users: Users,
  rbac: Shield,
  vendors: Users,
  pipeline: Activity,
}

export default function AuditLogPage() {
  const [logs, setLogs]               = useState([])
  const [stats, setStats]             = useState({ total: 0, today: 0, activeUsersToday: 0, criticalToday: 0 })
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)

  // Filters
  const [search, setSearch]           = useState('')
  const [filterRole, setFilterRole]   = useState('all')
  const [filterModule, setFilterModule] = useState('all')
  const [filterAction, setFilterAction] = useState('all')
  const [filterDate, setFilterDate]   = useState('all') // 'all' | 'today' | '7days' | '30days'
  const [page, setPage]               = useState(1)
  const [inspectLog, setInspectLog]   = useState(null)

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      let startDate = ''
      let endDate = ''
      const today = new Date()

      if (filterDate === 'today') {
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        startDate = `${yyyy}-${mm}-${dd}`
        endDate = `${yyyy}-${mm}-${dd}`
      } else if (filterDate === '7days') {
        const past = new Date(today)
        past.setDate(past.getDate() - 7)
        startDate = past.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
      } else if (filterDate === '30days') {
        const past = new Date(today)
        past.setDate(past.getDate() - 30)
        startDate = past.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
      }

      const params = {
        role: filterRole,
        module: filterModule,
        action_type: filterAction,
        search,
        startDate,
        endDate,
        limit: 500,
      }

      const res = await getAuditLogs(params)
      const logsData = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
      setLogs(logsData)

      if (res?.stats) {
        setStats(res.stats)
      } else {
        setStats({
          total: logsData.length,
          today: logsData.filter(l => new Date(l.created_at || l.createdAt).toDateString() === today.toDateString()).length,
          activeUsersToday: new Set(logsData.filter(l => new Date(l.created_at || l.createdAt).toDateString() === today.toDateString()).map(l => l.actor_id)).size,
          criticalToday: logsData.filter(l => ['delete', 'approve', 'flag', 'price_update', 'password_reset'].includes(l.action_type)).length,
        })
      }
    } catch (err) {
      toast.error('Failed to load activity logs')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filterRole, filterModule, filterAction, filterDate, search])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    setPage(1)
  }, [search, filterRole, filterModule, filterAction, filterDate])

  const pageSize = 25
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize
    return logs.slice(start, start + pageSize)
  }, [logs, page])

  const exportLogsCSV = () => {
    if (logs.length === 0) return toast.error('No activity logs to export')
    const headers = ['ID', 'Timestamp', 'Actor Name', 'Role', 'Action Type', 'Module', 'Entity Type', 'Entity ID', 'IP Address']
    const rows = logs.map(l => [
      l.id,
      new Date(l.created_at || l.createdAt).toLocaleString('en-IN'),
      `"${l.actor_name || ''}"`,
      l.actor_role,
      l.action_type,
      l.module,
      l.entity_type || '',
      l.entity_id || '',
      l.ip_address || '',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `activity_logs_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Activity logs exported as CSV!')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            User Activity Logs
          </h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Track real-time actions, order approvals, inventory adjustments, and administrative overrides across all users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            loading={refreshing}
            onClick={() => fetchLogs(true)}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Download}
            onClick={exportLogsCSV}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Total Recorded Logs</span>
            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-50 mt-2 font-mono">{stats.total}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Today's Activities</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">{stats.today}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Active Users Today</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-2 font-mono">{stats.activeUsersToday}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">High Impact Events Today</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 font-mono">{stats.criticalToday}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-800 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by User Name, Action, Module..."
              className="input-base pl-10 text-xs w-full"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="input-base text-xs w-full"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="inventory_manager">Inventory Manager</option>
              <option value="sales_manager">Sales Manager</option>
              <option value="dispatch_worker">Dispatch Worker</option>
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={filterModule}
              onChange={e => setFilterModule(e.target.value)}
              className="input-base text-xs w-full"
            >
              <option value="all">All Modules</option>
              <option value="orders">Orders</option>
              <option value="challans">Challans & Bills</option>
              <option value="products">Products & Stock</option>
              <option value="inward">Inward Entries</option>
              <option value="users">Users & Accounts</option>
              <option value="rbac">Permissions & Roles</option>
              <option value="pipeline">Pipeline</option>
              <option value="vendors">Vendors</option>
            </select>
          </div>

          {/* Action Type Filter */}
          <div>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="input-base text-xs w-full"
            >
              <option value="all">All Action Types</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="approve">Approve</option>
              <option value="flag">Flag</option>
              <option value="delete">Delete</option>
              <option value="price_update">Price Update</option>
              <option value="dispatch">Dispatch</option>
              <option value="login">Login</option>
            </select>
          </div>
        </div>

        {/* Date Quick Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-surface-100 dark:border-surface-800 text-xs">
          <span className="text-surface-400 font-medium mr-1">Time Range:</span>
          {[
            { id: 'all', label: 'All History' },
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterDate(btn.id)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                filterDate === btn.id
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-sm text-surface-400">Loading activity logs…</div>
        ) : paginatedLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Activity className="h-10 w-10 text-surface-300 mx-auto" />
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No activity logs found</h3>
            <p className="text-xs text-surface-500">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">TIMESTAMP</th>
                  <th className="px-5 py-3.5">USER / ACTOR</th>
                  <th className="px-5 py-3.5">ACTION</th>
                  <th className="px-5 py-3.5">MODULE / ENTITY</th>
                  <th className="px-5 py-3.5">IP ADDRESS</th>
                  <th className="px-5 py-3.5 text-right">DETAILS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm">
                {paginatedLogs.map(log => {
                  const roleCfg = ROLE_BADGES[log.actor_role] || { label: log.actor_role, color: 'bg-surface-100 text-surface-600' }
                  const actionColor = ACTION_COLORS[log.action_type] || 'bg-surface-100 text-surface-600 border-surface-200'
                  const ModuleIcon = MODULE_ICONS[log.module] || Activity
                  const dateObj = new Date(log.created_at || log.createdAt)
                  const timeFormatted = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                  const dateFormatted = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

                  return (
                    <tr key={log.id} className="table-row-hover">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-xs font-semibold text-surface-900 dark:text-surface-100">{timeFormatted}</div>
                        <div className="text-[11px] text-surface-400 font-medium">{dateFormatted}</div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold text-xs flex items-center justify-center shrink-0 border border-primary-200 dark:border-primary-800">
                            {(log.actor_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-surface-900 dark:text-surface-50 text-xs">{log.actor_name}</div>
                            <span className={cn('inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border mt-0.5', roleCfg.color)}>
                              {roleCfg.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider', actionColor)}>
                          {log.action_type.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-surface-700 dark:text-surface-300">
                          <ModuleIcon className="h-4 w-4 text-surface-400 shrink-0" />
                          <span className="capitalize font-semibold">{log.module}</span>
                          {log.entity_id && (
                            <span className="font-mono text-surface-500 text-[11px]">#{log.entity_id}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs font-mono text-surface-500 dark:text-surface-400 whitespace-nowrap">
                        {log.ip_address || '—'}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="secondary"
                          size="xs"
                          icon={Eye}
                          onClick={() => setInspectLog(log)}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          currentPage={page}
          totalItems={logs.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Inspect Log Details Modal */}
      <Modal open={!!inspectLog} onClose={() => setInspectLog(null)} title="Activity Log Inspector" size="lg">
        {inspectLog && (
          <div className="space-y-5">
            {/* Header info card */}
            <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-surface-400 uppercase tracking-wider block text-[10px]">Actor:</span>
                <span className="font-bold text-surface-900 dark:text-surface-100">{inspectLog.actor_name}</span> ({inspectLog.actor_role})
              </div>
              <div>
                <span className="text-surface-400 uppercase tracking-wider block text-[10px]">Action:</span>
                <span className="font-bold uppercase text-primary-600 dark:text-primary-400">{inspectLog.action_type}</span>
              </div>
              <div>
                <span className="text-surface-400 uppercase tracking-wider block text-[10px]">Module:</span>
                <span className="font-bold capitalize">{inspectLog.module}</span> (ID: {inspectLog.entity_id || 'N/A'})
              </div>
              <div>
                <span className="text-surface-400 uppercase tracking-wider block text-[10px]">Timestamp:</span>
                <span>{new Date(inspectLog.created_at || inspectLog.createdAt).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-surface-400 uppercase tracking-wider block text-[10px]">IP Address:</span>
                <span className="font-mono">{inspectLog.ip_address || '—'}</span>
              </div>
            </div>

            {/* Before vs After state */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wider">State Changes & Payload</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-surface-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-surface-800 space-y-1">
                  <span className="text-[10px] text-surface-400 uppercase font-sans font-bold block mb-1">After State / Changes:</span>
                  <pre className="text-xs leading-relaxed">{JSON.stringify(inspectLog.after_state || inspectLog.changed_fields || { message: 'Action executed' }, null, 2)}</pre>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-900 text-surface-300 font-mono text-xs overflow-x-auto border border-surface-800 space-y-1">
                  <span className="text-[10px] text-surface-400 uppercase font-sans font-bold block mb-1">Before State (Original):</span>
                  <pre className="text-xs leading-relaxed">{JSON.stringify(inspectLog.before_state || { status: 'none' }, null, 2)}</pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setInspectLog(null)}>Close Inspector</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
