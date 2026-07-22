import { useState, useCallback } from 'react'
import {
  BarChart3, Users, Building2, Truck, Brain, Loader2, Calendar,
  TrendingUp, TrendingDown, Package, RefreshCcw, Sparkles, History,
  AlertCircle, ChevronRight
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import {
  getSalesmanWise, getPartyWise, getSupplierWise,
  getActivityLog, getAiInsight
} from '../../../api/endpoints/reports.api'
import { useAuthStore } from '../../../store/authStore'

const TABS = [
  { id: 'salesman', label: 'Salesman-wise', icon: Users,    fetchFn: getSalesmanWise },
  { id: 'party',    label: 'Party-wise',    icon: Building2, fetchFn: getPartyWise },
  { id: 'supplier', label: 'Supplier-wise', icon: Truck,     fetchFn: getSupplierWise },
  { id: 'activity', label: 'Activity Log',  icon: History,   fetchFn: getActivityLog },
]

const today      = new Date().toISOString().split('T')[0]
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

function StatCard({ label, value, sub, color }) {
  return (
    <div className={cn('card p-4 border-l-4', color)}>
      <p className="text-xs text-surface-500 dark:text-surface-400">{label}</p>
      <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function SalesmanTable({ data }) {
  if (!data.length) return <EmptyState />
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
      <table className="w-full text-sm text-left">
        <thead className="bg-surface-50 dark:bg-surface-700/50 text-xs font-semibold uppercase text-surface-500">
          <tr>
            <th className="px-4 py-3">Salesman</th>
            <th className="px-4 py-3 text-right">Orders</th>
            <th className="px-4 py-3 text-right">Order Value</th>
            <th className="px-4 py-3 text-right">Items Sold</th>
            <th className="px-4 py-3 text-right">Challans</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
          {data.map((row, i) => (
            <tr key={row.id || i} className="table-row-hover">
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3 text-right">{row.orders}</td>
              <td className="px-4 py-3 text-right font-semibold text-primary-700 dark:text-primary-400">₹{parseFloat(row.order_value || 0).toFixed(0)}</td>
              <td className="px-4 py-3 text-right">{row.items_sold}</td>
              <td className="px-4 py-3 text-right">{row.challans}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PartyTable({ data }) {
  if (!data.length) return <EmptyState />
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
      <table className="w-full text-sm text-left">
        <thead className="bg-surface-50 dark:bg-surface-700/50 text-xs font-semibold uppercase text-surface-500">
          <tr>
            <th className="px-4 py-3">Party</th>
            <th className="px-4 py-3 text-right">Orders</th>
            <th className="px-4 py-3 text-right">Total Value</th>
            <th className="px-4 py-3 text-right">Items</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
          {data.map((row, i) => (
            <tr key={row.id || i} className="table-row-hover">
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3 text-right">{row.orders}</td>
              <td className="px-4 py-3 text-right font-semibold text-primary-700 dark:text-primary-400">₹{parseFloat(row.total_value || 0).toFixed(0)}</td>
              <td className="px-4 py-3 text-right">{row.items_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SupplierTable({ data }) {
  if (!data.length) return <EmptyState />
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
      <table className="w-full text-sm text-left">
        <thead className="bg-surface-50 dark:bg-surface-700/50 text-xs font-semibold uppercase text-surface-500">
          <tr>
            <th className="px-4 py-3">Supplier</th>
            <th className="px-4 py-3 text-right">POs</th>
            <th className="px-4 py-3 text-right">Total Value</th>
            <th className="px-4 py-3 text-right">Items</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
          {data.map((row, i) => (
            <tr key={row.id || i} className="table-row-hover">
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3 text-right">{row.pos}</td>
              <td className="px-4 py-3 text-right font-semibold text-primary-700 dark:text-primary-400">₹{parseFloat(row.total_value || 0).toFixed(0)}</td>
              <td className="px-4 py-3 text-right">{row.items_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ActivityTable({ data }) {
  if (!data.length) return <EmptyState />
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
      <table className="w-full text-sm text-left">
        <thead className="bg-surface-50 dark:bg-surface-700/50 text-xs font-semibold uppercase text-surface-500">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Module</th>
            <th className="px-4 py-3">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-xs">
          {data.map((log, i) => (
            <tr key={log.id || i} className="table-row-hover">
              <td className="px-4 py-2.5 font-medium">{log.actor_name || '—'}</td>
              <td className="px-4 py-2.5 capitalize text-surface-500">{log.actor_role || '—'}</td>
              <td className="px-4 py-2.5">
                <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium',
                  log.action_type === 'create' ? 'bg-success-50 text-success-700'
                    : log.action_type === 'delete' ? 'bg-danger-50 text-danger-600'
                    : log.action_type === 'update' ? 'bg-primary-50 text-primary-700'
                    : 'bg-surface-100 text-surface-600')}>
                  {log.action_type}
                </span>
              </td>
              <td className="px-4 py-2.5 capitalize">{log.module || '—'}</td>
              <td className="px-4 py-2.5 text-surface-400">{new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <BarChart3 className="mx-auto h-10 w-10 text-surface-300 mb-3" />
      <p className="text-sm font-medium text-surface-700 dark:text-surface-300">No data found</p>
      <p className="text-xs text-surface-500 mt-1">Try adjusting the date range or run a fetch</p>
    </div>
  )
}

export default function ReportsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin'

  const [activeTab, setActiveTab] = useState('salesman')
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate,   setEndDate]   = useState(today)
  const [data,      setData]      = useState([])
  const [loading,   setLoading]   = useState(false)
  const [period,    setPeriod]    = useState(null)

  const [aiInsight,   setAiInsight]   = useState('')
  const [aiLoading,   setAiLoading]   = useState(false)

  const fetchData = useCallback(async () => {
    const tab = TABS.find(t => t.id === activeTab)
    if (!tab) return
    setLoading(true)
    setAiInsight('')
    try {
      const params = activeTab === 'activity' ? { startDate, endDate } : { startDate, endDate }
      const res = await tab.fetchFn(params)
      if (res.success) {
        setData(res.data || [])
        setPeriod(res.period || null)
      } else {
        toast.error('Failed to fetch report data')
      }
    } catch (err) {
      toast.error('Error loading report')
    } finally {
      setLoading(false)
    }
  }, [activeTab, startDate, endDate])

  const handleAIInsight = async () => {
    if (!data.length) { toast.error('Fetch report data first'); return }
    if (!isAdmin) { toast.error('AI insights are admin-only'); return }
    setAiLoading(true)
    try {
      const res = await getAiInsight({ reportType: activeTab, data })
      if (res.success) setAiInsight(res.insight)
      else toast.error(res.error || 'AI insight failed')
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI insight failed. Check GEMINI_API_KEY in .env')
    } finally {
      setAiLoading(false)
    }
  }

  const topEntry = data.length > 0 ? data[0] : null
  const totalValue = data.reduce((s, r) => s + parseFloat(r.order_value || r.total_value || r.pos * 1000 || 0), 0)

  return (
    <div className="animate-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary-600" /> Reports & Insights
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Analyse performance across salesmen, parties, and suppliers. Get AI-powered insights.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl w-fit flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setData([]); setAiInsight('') }}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id ? 'bg-white dark:bg-surface-700 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300')}>
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Date Range + Fetch */}
      {activeTab !== 'activity' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-surface-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-base py-1.5 text-sm" />
            <span className="text-surface-400 text-sm">to</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-base py-1.5 text-sm" />
          </div>
          <Button variant="primary" size="sm" icon={loading ? Loader2 : RefreshCcw} onClick={fetchData} loading={loading} id="fetch-report-btn">
            Fetch Report
          </Button>
          {isAdmin && data.length > 0 && (
            <Button variant="secondary" size="sm" icon={Sparkles} onClick={handleAIInsight} loading={aiLoading} id="ai-insight-btn">
              AI Insight
            </Button>
          )}
        </div>
      )}
      {activeTab === 'activity' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-surface-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-base py-1.5 text-sm" />
            <span className="text-surface-400 text-sm">to</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-base py-1.5 text-sm" />
          </div>
          <Button variant="primary" size="sm" icon={loading ? Loader2 : RefreshCcw} onClick={fetchData} loading={loading}>Fetch Log</Button>
        </div>
      )}

      {/* AI Insight Panel */}
      {aiInsight && (
        <div className="card p-5 border-l-4 border-violet-500 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-100 dark:bg-violet-900/30 p-2 shrink-0">
              <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1 uppercase tracking-wider">Gemini AI Insight</p>
              <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed">{aiInsight}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      {data.length > 0 && activeTab !== 'activity' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Total Records" value={data.length} color="border-primary-400" />
          <StatCard label="Top Performer" value={topEntry?.name || '—'} sub={`Value: ₹${parseFloat(topEntry?.order_value || topEntry?.total_value || 0).toFixed(0)}`} color="border-success-400" />
          <StatCard label="Total Value" value={`₹${totalValue.toFixed(0)}`} sub={period ? `${period.startDate} – ${period.endDate}` : ''} color="border-violet-400" />
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600 mb-3" /><p className="text-xs text-surface-500">Fetching report data...</p></div>
        ) : data.length === 0 && !loading ? (
          <div className="p-4 text-center text-sm text-surface-500">
            Select a date range and click <strong>Fetch Report</strong> to load data.
          </div>
        ) : activeTab === 'salesman' ? <div className="p-4"><SalesmanTable data={data} /></div>
          : activeTab === 'party'    ? <div className="p-4"><PartyTable data={data} /></div>
          : activeTab === 'supplier' ? <div className="p-4"><SupplierTable data={data} /></div>
          : <div className="p-4"><ActivityTable data={data} /></div>
        }
      </div>
    </div>
  )
}
