import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Plus, Trash2, Building2, Package, Loader2, Send, ArrowLeft,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'
import { getCustomers } from '../../../api/endpoints/parties.api'
import { getProducts } from '../../../api/endpoints/products.api'
import { createOrder } from '../../../api/endpoints/orders.api'

/**
 * OrderNewPage — the Sales Manager creates a customer order. This is the entry
 * point of the fulfilment pipeline: a new order lands as PENDING, ready for the
 * Admin to approve into the pipeline.
 *
 * Backend contract: POST /orders { party_id, items: [{ product_id, quantity, sm_price }] }
 * The SM is taken from the auth token; GST (18%) and totals are computed server-side.
 */
export default function OrderNewPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [partyId, setPartyId] = useState('')
  const [lines, setLines] = useState([{ product_id: '', quantity: 1, sm_price: '' }])

  useEffect(() => {
    Promise.all([getCustomers(), getProducts()])
      .then(([cRes, pRes]) => {
        if (cRes.success) setCustomers(cRes.data)
        if (pRes.success) setProducts(pRes.data.rows || pRes.data)
      })
      .catch(err => toast.error(err.message || 'Failed to load form data'))
      .finally(() => setLoading(false))
  }, [])

  const productMap = useMemo(() => {
    const m = {}
    products.forEach(p => { m[p.id] = p })
    return m
  }, [products])

  const setLine = (idx, patch) => setLines(ls => ls.map((l, i) => i === idx ? { ...l, ...patch } : l))
  const addLine = () => setLines(ls => [...ls, { product_id: '', quantity: 1, sm_price: '' }])
  const removeLine = (idx) => setLines(ls => ls.length === 1 ? ls : ls.filter((_, i) => i !== idx))

  const onPickProduct = (idx, product_id) => {
    const p = productMap[product_id]
    setLine(idx, { product_id, sm_price: p ? String(p.selling_price ?? '') : '' })
  }

  const subtotal = useMemo(() => lines.reduce((sum, l) => {
    const q = parseFloat(l.quantity) || 0
    const price = parseFloat(l.sm_price) || 0
    return sum + q * price
  }, 0), [lines])
  const gst = +(subtotal * 0.18).toFixed(2)
  const grandTotal = +(subtotal + gst).toFixed(2)

  const submit = async () => {
    if (!partyId) return toast.error('Select a customer')
    const items = lines
      .filter(l => l.product_id)
      .map(l => ({ product_id: Number(l.product_id), quantity: Number(l.quantity), sm_price: Number(l.sm_price) }))
    if (items.length === 0) return toast.error('Add at least one product')
    for (const it of items) {
      if (!it.quantity || it.quantity <= 0) return toast.error('Every line needs a quantity greater than zero')
      if (it.sm_price === '' || isNaN(it.sm_price) || it.sm_price < 0) return toast.error('Every line needs a valid selling price')
    }

    setSubmitting(true)
    try {
      const res = await createOrder({ party_id: Number(partyId), items })
      if (res.success) {
        toast.success('Order created — now awaiting Admin approval')
        navigate('/sm/orders')
      } else {
        toast.error(res.error || 'Failed to create order')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-surface-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/sm/orders')} className="rounded-lg p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-surface-900 dark:text-surface-50">
            <ShoppingCart className="h-5 w-5 text-primary-600" /> New Order
          </h1>
          <p className="text-sm text-surface-500">Create a customer order to start the fulfilment pipeline.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
        <label className="block space-y-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
          <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-surface-400" /> Customer <span className="text-danger-500">*</span></span>
          <select className="input-base w-full" value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            <option value="">Select a customer…</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-surface-900 dark:text-surface-50"><Package className="h-4 w-4 text-surface-400" /> Items</h2>
          <Button size="sm" variant="secondary" icon={Plus} onClick={addLine}>Add item</Button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[1.6fr_0.7fr_0.9fr_auto] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-surface-400">
            <span>Product</span><span className="text-right">Qty</span><span className="text-right">Unit Price</span><span></span>
          </div>
          {lines.map((l, idx) => {
            const p = productMap[l.product_id]
            return (
              <div key={idx} className="grid grid-cols-[1.6fr_0.7fr_0.9fr_auto] items-center gap-2">
                <select className="input-base w-full" value={l.product_id} onChange={(e) => onPickProduct(idx, e.target.value)}>
                  <option value="">Select…</option>
                  {products.map(pr => <option key={pr.id} value={pr.id}>{pr.name} ({pr.sku})</option>)}
                </select>
                <input type="number" min="1" className="input-base w-full text-right" value={l.quantity} onChange={(e) => setLine(idx, { quantity: e.target.value })} />
                <input type="number" min="0" step="0.01" className="input-base w-full text-right" value={l.sm_price} onChange={(e) => setLine(idx, { sm_price: e.target.value })} placeholder={p ? String(p.selling_price) : '0.00'} />
                <button onClick={() => removeLine(idx)} disabled={lines.length === 1} className={cn('rounded-lg p-2 text-surface-400 transition-colors', lines.length === 1 ? 'opacity-30' : 'hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/20')}><Trash2 className="h-4 w-4" /></button>
              </div>
            )
          })}
        </div>

        <div className="mt-4 space-y-1 border-t border-surface-200 pt-3 text-sm dark:border-surface-700">
          <div className="flex justify-between text-surface-600 dark:text-surface-300"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between text-surface-600 dark:text-surface-300"><span>GST (18%)</span><span>₹{gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between font-semibold text-surface-900 dark:text-surface-50"><span>Grand Total</span><span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate('/sm/orders')}>Cancel</Button>
        <Button icon={Send} loading={submitting} onClick={submit}>Create Order</Button>
      </div>
    </div>
  )
}
