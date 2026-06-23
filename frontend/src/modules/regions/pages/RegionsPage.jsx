import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getRegions, createRegion, updateRegion, deleteRegion } from '../../../api/endpoints/regions.api'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import { Plus, Search, MapPin, AlertCircle, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'

// ─── Schema ──────────────────────────────────────────────────────────────────
const regionSchema = z.object({
  name: z.string().min(1, 'Region name is required').max(100),
  description: z.string().max(255, 'Description cannot exceed 255 characters').optional().or(z.literal('')),
})

export default function RegionsPage() {
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [activeRegion, setActiveRegion] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // ── Forms ──────────────────────────────────────
  const createForm = useForm({
    resolver: zodResolver(regionSchema),
    defaultValues: { name: '', description: '' },
  })

  const editForm = useForm({
    resolver: zodResolver(regionSchema),
    defaultValues: { name: '', description: '' },
  })

  // ── Data fetching ──────────────────────────────
  const fetchRegions = async () => {
    setLoading(true)
    try {
      const res = await getRegions()
      if (res.success) {
        setRegions(res.data)
      } else {
        toast.error(res.error || 'Failed to load regions')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load regions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegions()
  }, [])

  // ── Handlers ───────────────────────────────────
  const openCreate = () => {
    createForm.reset({ name: '', description: '' })
    setSubmitError(null)
    setIsCreateOpen(true)
  }

  const onCreateSubmit = async (data) => {
    setSubmitError(null)
    try {
      const res = await createRegion(data)
      if (res.success) {
        toast.success('Region created successfully!')
        setIsCreateOpen(false)
        fetchRegions()
      } else {
        setSubmitError(res.error || 'Failed to create region')
      }
    } catch (err) {
      setSubmitError(err.message || 'Error creating region')
    }
  }

  const openEdit = (region) => {
    setActiveRegion(region)
    editForm.reset({
      name: region.name,
      description: region.description || '',
    })
    setSubmitError(null)
    setIsEditOpen(true)
  }

  const onEditSubmit = async (data) => {
    setSubmitError(null)
    try {
      const res = await updateRegion(activeRegion.id, data)
      if (res.success) {
        toast.success('Region updated successfully!')
        setIsEditOpen(false)
        fetchRegions()
      } else {
        setSubmitError(res.error || 'Failed to update region')
      }
    } catch (err) {
      setSubmitError(err.message || 'Error updating region')
    }
  }

  const openDelete = (region) => {
    setActiveRegion(region)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      const res = await deleteRegion(activeRegion.id)
      if (res.success) {
        toast.success(`Region "${activeRegion.name}" deleted.`)
        setIsDeleteOpen(false)
        fetchRegions()
      } else {
        toast.error(res.error || 'Failed to delete region')
      }
    } catch (err) {
      toast.error(err.message || 'Error deleting region')
    } finally {
      setDeleting(false)
    }
  }

  const filteredRegions = regions.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            Regions Management
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Define, edit, and organize commercial territories.
          </p>
        </div>
        <Button onClick={openCreate} icon={Plus} size="md" id="create-region-btn" className="w-full sm:w-auto">
          Create Region
        </Button>
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by region name or description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-base pl-9 py-1.5"
              id="region-search-input"
            />
          </div>
          <div className="text-xs text-surface-500 font-medium">
            Showing {filteredRegions.length} of {regions.length} regions
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              <div className="h-6 bg-surface-200 dark:bg-surface-700 animate-pulse rounded w-1/3" />
              <div className="h-20 bg-surface-100 dark:bg-surface-800 animate-pulse rounded" />
              <div className="h-20 bg-surface-100 dark:bg-surface-800 animate-pulse rounded" />
            </div>
          ) : filteredRegions.length === 0 ? (
            <div className="p-12 text-center">
              <MapPin className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600 mb-3" />
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">No regions found</h3>
              <p className="text-xs text-surface-500 mt-1">Try adjusting your search or create a new region.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Region Name</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300">
                {filteredRegions.map(region => (
                  <tr key={region.id} className="table-row-hover">
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs shrink-0">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-surface-900 dark:text-surface-50">{region.name}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-6 py-4 text-surface-600 dark:text-surface-300">
                      {region.description || <span className="text-surface-400 font-normal italic">No description provided</span>}
                    </td>

                    {/* Created At */}
                    <td className="px-6 py-4 text-xs font-medium text-surface-500 dark:text-surface-400">
                      {region.created_at ? new Date(region.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(region)}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                          title="Edit region"
                          id={`edit-region-${region.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDelete(region)}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                          title="Delete region"
                          id={`delete-region-${region.id}`}
                        >
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

      {/* ── Create Region Modal ────────────────────────────────────────────── */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Region"
        description="Add a new commercial region for your sales team and partners."
        size="md"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4" noValidate>
          {submitError && (
            <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          <Input
            {...createForm.register('name')}
            label="Region Name"
            placeholder="e.g. North UP"
            required
            error={createForm.formState.errors.name?.message}
            icon={MapPin}
            id="region-create-name"
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="region-create-desc" className="text-xs font-medium text-surface-700 dark:text-surface-300">
              Description
            </label>
            <textarea
              {...createForm.register('description')}
              id="region-create-desc"
              rows={3}
              placeholder="Provide a brief description of the coverage or scope of this region..."
              className={cn(
                'input-base py-2 resize-none',
                createForm.formState.errors.description && 'border-danger-500 focus:ring-danger-500'
              )}
            />
            {createForm.formState.errors.description && (
              <p className="text-xs text-danger-600">{createForm.formState.errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={createForm.formState.isSubmitting} id="region-create-cancel">
              Cancel
            </Button>
            <Button type="submit" loading={createForm.formState.isSubmitting} id="region-create-submit">
              Create Region
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Region Modal ──────────────────────────────────────────────── */}
      <Modal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Region: ${activeRegion?.name}`}
        description="Update region properties and description details."
        size="md"
      >
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4" noValidate>
          {submitError && (
            <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          <Input
            {...editForm.register('name')}
            label="Region Name"
            placeholder="e.g. North UP"
            required
            error={editForm.formState.errors.name?.message}
            icon={MapPin}
            id="region-edit-name"
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="region-edit-desc" className="text-xs font-medium text-surface-700 dark:text-surface-300">
              Description
            </label>
            <textarea
              {...editForm.register('description')}
              id="region-edit-desc"
              rows={3}
              placeholder="Provide a brief description of the coverage or scope of this region..."
              className={cn(
                'input-base py-2 resize-none',
                editForm.formState.errors.description && 'border-danger-500 focus:ring-danger-500'
              )}
            />
            {editForm.formState.errors.description && (
              <p className="text-xs text-danger-600">{editForm.formState.errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)} disabled={editForm.formState.isSubmitting} id="region-edit-cancel">
              Cancel
            </Button>
            <Button type="submit" loading={editForm.formState.isSubmitting} id="region-edit-submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ───────────────────────────────────────────── */}
      <Modal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Region"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-300">
            Are you sure you want to delete <strong className="text-surface-900 dark:text-surface-50">{activeRegion?.name}</strong>?
            This action cannot be undone and will delete the region.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteOpen(false)} disabled={deleting} id="region-delete-cancel">
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete} icon={Trash2} id="region-delete-confirm">
              Delete Region
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
