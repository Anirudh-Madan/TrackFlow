import { useState, useEffect } from 'react'
import { Shield, Lock, Key, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Settings } from 'lucide-react'
import Button from '../../../components/ui/Button'
import toast from 'react-hot-toast'
import { getSettings, setAdminPin, verifyAdminPin } from '../../../api/endpoints/settings.api'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../utils/cn'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin'

  const [pinSet, setPinSet] = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({ current_pin: '', new_pin: '', confirm_pin: '' })
  const [show, setShow]   = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    getSettings()
      .then((res) => {
        if (res?.success) setPinSet(res.data?.pin_set)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAdmin])

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const toggleShow   = (field) => setShow(s => ({ ...s, [field]: !s[field] }))

  const handleSetPin = async (e) => {
    e.preventDefault()
    if (form.new_pin !== form.confirm_pin) {
      toast.error('New PINs do not match')
      return
    }
    if (form.new_pin.length < 4) {
      toast.error('PIN must be at least 4 characters')
      return
    }
    setSaving(true)
    try {
      const body = { new_pin: form.new_pin }
      if (form.current_pin.trim()) body.current_pin = form.current_pin
      const response = await setAdminPin(body)
      const payload = response?.data ?? response
      if (payload.success) {
        toast.success(pinSet ? 'PIN updated successfully!' : 'Admin PIN has been set!')
        setPinSet(true)
        setForm({ current_pin: '', new_pin: '', confirm_pin: '' })
      } else {
        toast.error(payload.error || 'Failed to set PIN')
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to set PIN')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="animate-in flex flex-col items-center justify-center h-64 gap-3 text-center">
        <AlertCircle className="h-10 w-10 text-danger-500" />
        <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Admin Only</h2>
        <p className="text-sm text-surface-500">Settings are only accessible to administrators.</p>
      </div>
    )
  }

  return (
    <div className="animate-in space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary-600" />
          Settings
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Manage admin-level configurations for TrackFlow.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-surface-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading settings...
        </div>
      ) : (
        <>
          {/* Admin Edit PIN Card */}
          <div className="card p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary-100 dark:bg-primary-900/30 p-2.5">
                <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="font-semibold text-surface-900 dark:text-surface-50">Admin Edit PIN</h2>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  This PIN is required to create, edit, or delete challans and purchase orders. Leave the current PIN field blank for first-time setup.
                </p>
                <span className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium mt-2 px-2 py-0.5 rounded-full',
                  pinSet
                    ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                    : 'bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400'
                )}>
                  {pinSet ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {pinSet ? 'PIN is set' : 'PIN not configured'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSetPin} className="space-y-4">
              {pinSet && (
                <div>
                  <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    Current PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                    <input
                      type={show.current ? 'text' : 'password'}
                      name="current_pin"
                      value={form.current_pin}
                      onChange={handleChange}
                      className="input-base pl-9 pr-10"
                      placeholder="Leave blank for first-time setup"
                      id="current-pin"
                    />
                    <button type="button" onClick={() => toggleShow('current')} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                      {show.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  {pinSet ? 'New PIN' : 'Set PIN'}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                  <input
                    type={show.new ? 'text' : 'password'}
                    name="new_pin"
                    value={form.new_pin}
                    onChange={handleChange}
                    className="input-base pl-9 pr-10"
                    placeholder="Enter new PIN (min 4 characters)"
                    required
                    id="new-pin"
                    minLength={4}
                  />
                  <button type="button" onClick={() => toggleShow('new')} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                    {show.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Confirm New PIN
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                  <input
                    type={show.confirm ? 'text' : 'password'}
                    name="confirm_pin"
                    value={form.confirm_pin}
                    onChange={handleChange}
                    className={cn('input-base pl-9 pr-10', form.confirm_pin && form.confirm_pin !== form.new_pin && 'border-danger-400 focus:ring-danger-400')}
                    placeholder="Confirm new PIN"
                    required
                    id="confirm-pin"
                  />
                  <button type="button" onClick={() => toggleShow('confirm')} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                    {show.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.confirm_pin && form.confirm_pin !== form.new_pin && (
                  <p className="text-xs text-danger-500 mt-1">PINs do not match</p>
                )}
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  disabled={saving || (form.new_pin !== form.confirm_pin && form.confirm_pin.length > 0)}
                  id="save-pin-btn"
                >
                  {pinSet ? 'Update PIN' : 'Set PIN'}
                </Button>
              </div>
            </form>
          </div>

          {/* AI Reports Config Info */}
          <div className="card p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-violet-100 dark:bg-violet-900/30 p-2.5">
                <AlertCircle className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="font-semibold text-surface-900 dark:text-surface-50">AI Reports (Gemini)</h2>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  AI-powered insights on reports use Google Gemini. Ensure <code className="bg-surface-100 dark:bg-surface-700 px-1 rounded text-xs">GEMINI_API_KEY</code> is set in the backend <code className="bg-surface-100 dark:bg-surface-700 px-1 rounded text-xs">.env</code> file.
                </p>
                <a
                  href="https://aistudio.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-block"
                >
                  Get a free API key at aistudio.google.com →
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
