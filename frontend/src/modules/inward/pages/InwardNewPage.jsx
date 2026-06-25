import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Trash, ArrowLeft, Save, Loader2, Package } from 'lucide-react'
import { getProducts } from '../../../api/endpoints/products.api'
import { createInward } from '../../../api/endpoints/inward.api'
import toast from 'react-hot-toast'

export default function InwardNewPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [supplierName, setSupplierName] = useState('')
  const [billNumber, setBillNumber] = useState('')
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ product_id: '', quantity_received: 1 }])

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await getProducts();
        if (res.data?.success) {
          setProducts(res.data.data);
        }
      } catch (error) {
        toast.error('Failed to load products catalogue');
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { product_id: '', quantity_received: 1 }]);
  };

  const handleRemoveItem = (index) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated.length === 0 ? [{ product_id: '', quantity_received: 1 }] : updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierName.trim()) return toast.error('Supplier name is required');
    if (!billNumber.trim()) return toast.error('Bill number is required');
    if (!billDate) return toast.error('Bill date is required');

    // Filter valid items
    const validItems = items.filter(i => i.product_id && i.quantity_received > 0);
    if (validItems.length === 0) {
      return toast.error('Please add at least one item with quantity received');
    }

    setSubmitting(true);
    try {
      const res = await createInward({
        supplier_name: supplierName,
        bill_number: billNumber,
        bill_date: billDate,
        notes: notes || undefined,
        items: validItems.map(i => ({
          product_id: parseInt(i.product_id),
          quantity_received: parseInt(i.quantity_received),
        })),
      });

      if (res.data?.success) {
        toast.success('Inward entry recorded successfully!');
        navigate('/im/inward');
      } else {
        toast.error(res.data?.error || 'Failed to create inward entry');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create inward entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/im/inward" className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">New Inward Goods Receipt</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400">Record a shipment delivery from a supplier and update on-hand stock.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Details Card */}
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Inward Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Supplier Name *</label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={e => setSupplierName(e.target.value)}
                placeholder="e.g. Jindal Steel Works"
                className="w-full text-sm px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg bg-transparent focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
            {/* Bill Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Invoice / Bill Number *</label>
              <input
                type="text"
                required
                value={billNumber}
                onChange={e => setBillNumber(e.target.value)}
                placeholder="e.g. INV-1092-23"
                className="w-full text-sm px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg bg-transparent focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
            {/* Bill Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Invoice / Bill Date *</label>
              <input
                type="date"
                required
                value={billDate}
                onChange={e => setBillDate(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg bg-transparent focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Notes (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add details about shipment state, vehicle log, remarks, etc."
              className="w-full text-sm px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg bg-transparent focus:ring-1 focus:ring-primary-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Dynamic Items Receipt Table */}
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-600" />
              Received Line Items
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition-colors border border-primary-200/50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800/40 rounded-xl border border-surface-200/50 dark:border-surface-800/50">
                {/* Product selector */}
                <div className="flex-1 space-y-1 sm:space-y-0">
                  <select
                    required
                    value={item.product_id}
                    onChange={e => handleItemChange(index, 'product_id', e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 focus:ring-1 focus:ring-primary-500 outline-none"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="w-full sm:w-44 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity_received}
                    onChange={e => handleItemChange(index, 'quantity_received', parseInt(e.target.value) || 0)}
                    placeholder="Qty"
                    className="w-full text-sm px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                  <span className="text-xs text-surface-500 select-none w-10">
                    {products.find(p => String(p.id) === String(item.product_id))?.uom?.code || 'units'}
                  </span>
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="p-2 text-danger-500 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/20 rounded-lg transition-colors border border-transparent self-end sm:self-auto"
                  title="Remove item"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/im/inward"
            className="px-4 py-2 text-sm font-semibold text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800 rounded-lg transition-colors border border-surface-200 dark:border-surface-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Receipt
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
