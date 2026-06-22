import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../../store/authStore'
import Button from '../../../components/ui/Button'
import { Lock } from 'lucide-react'
import { cn } from '../../../utils/cn'

const schema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export default function ChangePasswordPage() {
  const { setUser, user } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 600))
    // Mark password changed
    setUser({ ...user, must_change_password: false }, 'mock-token')
    navigate('/admin')
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
        <div>
          <label htmlFor="new-password" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            New Password
          </label>
          <input
            {...register('newPassword')}
            id="new-password"
            type="password"
            autoComplete="new-password"
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
