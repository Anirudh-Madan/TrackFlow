import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../../store/authStore'
import { changePassword } from '../../../api/endpoints/auth.api'
import Button from '../../../components/ui/Button'
import { Lock, AlertCircle } from 'lucide-react'
import { cn } from '../../../utils/cn'
import toast from 'react-hot-toast'

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export default function ChangePasswordPage() {
  const { setUser, user, accessToken } = useAuthStore()
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setError(null)
    try {
      const res = await changePassword(data.currentPassword, data.newPassword)
      if (res.success) {
        toast.success('Password changed successfully!')
        // Mark password changed in local auth state
        setUser({ ...user, must_change_password: false }, accessToken)
        
        // Redirect based on role
        if (user.role === 'admin') {
          navigate('/admin')
        } else if (user.role === 'sales_manager') {
          navigate('/sm')
        } else if (user.role === 'inventory_manager') {
          navigate('/im')
        } else if (user.role === 'dispatch_worker') {
          navigate('/dw')
        }
      } else {
        setError(res.error || 'Failed to change password.')
      }
    } catch (err) {
      setError(err.message || 'Error changing password.')
    }
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <div className="w-10 h-10 rounded-xl bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center mb-4">
          <Lock className="h-5 w-5 text-warning-600" />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight mb-2">
          Set new password
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Please change your password before continuing.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label htmlFor="current-password" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Current Password
          </label>
          <input
            {...register('currentPassword')}
            id="current-password"
            type="password"
            autoComplete="current-password"
            placeholder="e.g. admin123"
            className={cn('input-base', errors.currentPassword && 'border-danger-500')}
          />
          {errors.currentPassword && <p className="text-xs text-danger-600 mt-1">{errors.currentPassword.message}</p>}
        </div>

        <div>
          <label htmlFor="new-password" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            New Password
          </label>
          <input
            {...register('newPassword')}
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="Min 8 characters"
            className={cn('input-base', errors.newPassword && 'border-danger-500')}
          />
          {errors.newPassword && <p className="text-xs text-danger-600 mt-1">{errors.newPassword.message}</p>}
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Confirm Password
          </label>
          <input
            {...register('confirmPassword')}
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            className={cn('input-base', errors.confirmPassword && 'border-danger-500')}
          />
          {errors.confirmPassword && <p className="text-xs text-danger-600 mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} id="change-password-submit-btn">
          Set Password & Continue
        </Button>
      </form>
    </div>
  )
}
