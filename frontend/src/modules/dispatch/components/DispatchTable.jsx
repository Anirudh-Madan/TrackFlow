import { useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  Plus,
  Search,
  Truck,
  UserRound,
  Phone,
  FileText,
  Wrench,
  Trash2,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'

const INITIAL_DISPATCHES = [
  {
    id: 'DSP-001',
    challan_id: 'CHN-2406-0041',
    order_id: 'ORD-2406-0098',
    dispatch_date: '2026-06-22',
    status: 'completed',
    vehicle_number: 'UP32 AK 4512',
    driver_name: 'Suresh Yadav',
    driver_phone: '9876543210',
    remarks: 'Delivered to Verma Enterprises before noon.',
    items: [
      { product_id: 'PRD-1021', product_name: 'Heavy Duty Pipe 2"', quantity_shipped: 120, uom: 'pcs', remarks: 'Packed in 6 bundles' },
      { product_id: 'PRD-1044', product_name: 'Elbow Connector 90°', quantity_shipped: 80, uom: 'pcs', remarks: 'Boxed separately' },
    ],
  },
  {
    id: 'DSP-002',
    challan_id: 'CHN-2406-0040',
    order_id: 'ORD-2406-0095',
    dispatch_date: '2026-06-22',
    status: 'in_transit',
    vehicle_number: 'UP78 BK 9901',
    driver_name: 'Ramesh Verma',
    driver_phone: '9123456780',
    remarks: 'Out for delivery to Kanpur metro route.',
    items: [
      { product_id: 'PRD-2011', product_name: 'GI Clamp 1"', quantity_shipped: 200, uom: 'pcs', remarks: '' },
    ],
  },
  {
    id: 'DSP-003',
    challan_id: 'CHN-2406-0038',
    order_id: 'ORD-2406-0088',
    dispatch_date: '2026-06-23',
    status: 'pending',
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    remarks: 'Awaiting loading confirmation.',
    items: [
      { product_id: 'PRD-4001', product_name: 'CPVC Pipe 3/4" (10ft)', quantity_shipped: 500, uom: 'pcs', remarks: 'Need pallet lift' },
    ],
  },
]

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-900/40', icon: Clock3 },
  in_transit: { label: 'In Transit', color: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-900/40', icon: Truck },
  completed: { label: 'Completed', color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-900/40', icon: CheckCircle2 },
}

const EMPTY_ITEM = {
  product_id: '',
  product_name: '',
  quantity_shipped: '',
  uom: 'pcs',
  remarks: '',
}

const EMPTY_DISPATCH = {
  id: '',
  challan_id: '',
  order_id: '',
  dispatch_date: new Date().toISOString().slice(0, 10),
  status: 'pending',
  vehicle_number: '',
  driver_name: '',
  driver_phone: '',
  remarks: '',
  items: [{ ...EMPTY_ITEM }],
}

export default function DispatchTable() {
  const [dispatches, setDispatches] = useState(INITIAL_DISPATCHES)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDispatchId, setEditingDispatchId] = useState(null)
  const [form, setForm] = useState(EMPTY_DISPATCH)

  const filteredDispatches = useMemo(() => {
    return dispatches.filter((dispatch) => {
      const haystack = `${dispatch.id} ${dispatch.challan_id} ${dispatch.order_id} ${dispatch.driver_name} ${dispatch.vehicle_number}`.toLowerCase()
      const matchesSearch = haystack.includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || dispatch.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [dispatches, search, statusFilter])

  const stats = useMemo(() => ({
    total: dispatches.length,
    pending: dispatches.filter((dispatch) => dispatch.status === 'pending').length,
    in_transit: dispatches.filter((dispatch) => dispatch.status === 'in_transit').length,
    completed: dispatches.filter((dispatch) => dispatch.status === 'completed').length,
  }), [dispatches])

  const openCreateModal = () => {
    setEditingDispatchId(null)
    setForm({ ...EMPTY_DISPATCH, items: [{ ...EMPTY_ITEM }] })
    setIsModalOpen(true)
  }

  const openEditModal = (dispatch) => {
    setEditingDispatchId(dispatch.id)
    setForm({
      ...dispatch,
      items: dispatch.items.map((item) => ({ ...item })),
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingDispatchId(null)
    setForm({ ...EMPTY_DISPATCH, items: [{ ...EMPTY_ITEM }] })
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }))
  }

  const addItemRow = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }))
  }

  const removeItemRow = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const submitDispatch = (event) => {
    event.preventDefault()

    const payload = {
      ...form,
      id: editingDispatchId || `DSP-${String(dispatches.length + 1).padStart(3, '0')}`,
      items: form.items.filter((item) => item.product_name || item.product_id || item.quantity_shipped),
    }

    if (!payload.challan_id || !payload.order_id) {
      return
    }

    if (editingDispatchId) {
      setDispatches((prev) => prev.map((dispatch) => (dispatch.id === editingDispatchId ? payload : dispatch)))
    } else {
      setDispatches((prev) => [payload, ...prev])
    }

    closeModal()
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-50">Dispatch Management</h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Track dispatches against challans and orders, including vehicle and driver details.
          </p>
        </div>
        <Button icon={Plus} onClick={openCreateModal} id="create-dispatch-btn">
          New Dispatch
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Dispatches', value: stats.total, color: 'text-surface-900 dark:text-surface-50' },
          { label: 'Pending', value: stats.pending, color: 'text-warning-600 dark:text-warning-400' },
          { label: 'In Transit', value: stats.in_transit, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Completed', value: stats.completed, color: 'text-success-600 dark:text-success-400' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-surface-500 dark:text-surface-400">{stat.label}</p>
            <p className={cn('mt-1 text-2xl font-semibold', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-surface-200 bg-surface-50/60 p-4 dark:border-surface-700 dark:bg-surface-800/60 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dispatch, challan, order..."
              className="input-base w-full pl-9"
              id="dispatch-search"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'in_transit', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === status
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-surface-300 bg-white text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
                )}
              >
                {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
            <thead className="bg-surface-50/70 dark:bg-surface-800/70">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Dispatch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Challan / Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Vehicle & Driver</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 bg-white dark:divide-surface-700 dark:bg-surface-900">
              {filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-sm text-surface-500">
                    No dispatches match the current view.
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((dispatch) => {
                  const StatusIcon = STATUS_CONFIG[dispatch.status]?.icon || Clock3
                  return (
                    <tr key={dispatch.id} className="hover:bg-surface-50/70 dark:hover:bg-surface-800/70">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-surface-900 dark:text-surface-50">{dispatch.id}</div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-surface-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {dispatch.dispatch_date}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                          <FileText className="h-4 w-4 text-surface-400" />
                          {dispatch.challan_id}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                          <Package className="h-4 w-4 text-surface-400" />
                          {dispatch.order_id}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                          <Truck className="h-4 w-4 text-surface-400" />
                          {dispatch.vehicle_number || '—'}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                          <UserRound className="h-4 w-4 text-surface-400" />
                          {dispatch.driver_name || '—'}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-surface-500">
                          <Phone className="h-4 w-4 text-surface-400" />
                          {dispatch.driver_phone || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-surface-900 dark:text-surface-50">{dispatch.items.length} products</div>
                        <div className="mt-1 space-y-1 text-sm text-surface-500">
                          {dispatch.items.slice(0, 2).map((item) => (
                            <div key={`${dispatch.id}-${item.product_id}`}>
                              {item.product_name} · {item.quantity_shipped} {item.uom}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold', STATUS_CONFIG[dispatch.status]?.color)}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {STATUS_CONFIG[dispatch.status]?.label || dispatch.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="secondary" size="sm" onClick={() => openEditModal(dispatch)} id={`edit-dispatch-${dispatch.id}`}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingDispatchId ? 'Edit Dispatch' : 'Create Dispatch'}
        description="Link a physical dispatch to a challan and order, then capture the product line items shipped."
        size="xl"
        footer={(
          <>
            <Button variant="secondary" onClick={closeModal} id="dispatch-modal-cancel">
              Cancel
            </Button>
            <Button onClick={submitDispatch} id="dispatch-modal-save">
              {editingDispatchId ? 'Save Changes' : 'Save Dispatch'}
            </Button>
          </>
        )}
      >
        <form className="space-y-6" onSubmit={submitDispatch}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Challan ID</span>
              <input className="input-base w-full" value={form.challan_id} onChange={(event) => updateField('challan_id', event.target.value)} placeholder="CHN-2406-0042" required />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Order ID</span>
              <input className="input-base w-full" value={form.order_id} onChange={(event) => updateField('order_id', event.target.value)} placeholder="ORD-2406-0100" required />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Dispatch Date</span>
              <input type="date" className="input-base w-full" value={form.dispatch_date} onChange={(event) => updateField('dispatch_date', event.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Status</span>
              <select className="input-base w-full" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Vehicle Number</span>
              <input className="input-base w-full" value={form.vehicle_number} onChange={(event) => updateField('vehicle_number', event.target.value)} placeholder="UP32 AK 4512" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Driver Name</span>
              <input className="input-base w-full" value={form.driver_name} onChange={(event) => updateField('driver_name', event.target.value)} placeholder="Suresh Yadav" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
              <span>Driver Phone</span>
              <input className="input-base w-full" value={form.driver_phone} onChange={(event) => updateField('driver_phone', event.target.value)} placeholder="9876543210" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200 md:col-span-2">
              <span>Remarks</span>
              <textarea className="input-base min-h-[80px] w-full" value={form.remarks} onChange={(event) => updateField('remarks', event.target.value)} placeholder="Notes for packing, delivery conditions, or special handling." />
            </label>
          </div>

          <div className="rounded-2xl border border-surface-200 p-4 dark:border-surface-700">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Dispatch Items</h3>
                <p className="text-sm text-surface-500">Capture each product shipped for this dispatch.</p>
              </div>
              <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addItemRow} id="add-dispatch-item-btn">
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {form.items.map((item, index) => (
                <div key={`${item.product_id || 'new'}-${index}`} className="grid gap-3 rounded-xl border border-surface-200 p-3 dark:border-surface-700 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]">
                  <label className="space-y-1 text-sm font-medium text-surface-700 dark:text-surface-200">
                    <span>Product</span>
                    <input className="input-base w-full" value={item.product_name} onChange={(event) => updateItem(index, 'product_name', event.target.value)} placeholder="Product name" />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-surface-700 dark:text-surface-200">
                    <span>Product ID</span>
                    <input className="input-base w-full" value={item.product_id} onChange={(event) => updateItem(index, 'product_id', event.target.value)} placeholder="PRD-1001" />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-surface-700 dark:text-surface-200">
                    <span>Qty Shipped</span>
                    <input type="number" min="0" className="input-base w-full" value={item.quantity_shipped} onChange={(event) => updateItem(index, 'quantity_shipped', event.target.value)} placeholder="0" />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-surface-700 dark:text-surface-200">
                    <span>UOM</span>
                    <input className="input-base w-full" value={item.uom} onChange={(event) => updateItem(index, 'uom', event.target.value)} placeholder="pcs" />
                  </label>
                  <div className="flex items-end">
                    <button type="button" onClick={() => removeItemRow(index)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-danger-200 text-danger-600 transition-colors hover:bg-danger-50 dark:border-danger-900/40 dark:text-danger-400 dark:hover:bg-danger-900/20" aria-label="Remove item">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <label className="space-y-1 text-sm font-medium text-surface-700 dark:text-surface-200 md:col-span-5">
                    <span>Item Remarks</span>
                    <input className="input-base w-full" value={item.remarks} onChange={(event) => updateItem(index, 'remarks', event.target.value)} placeholder="Packing or route notes" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
