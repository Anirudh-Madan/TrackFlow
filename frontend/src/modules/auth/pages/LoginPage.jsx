import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../../store/authStore'
import { useNotificationStore } from '../../../store/notificationStore'
import { login } from '../../../api/endpoints/auth.api'
import Button from '../../../components/ui/Button'
import { Eye, EyeOff, Lock, User as UserIcon, AlertCircle } from 'lucide-react'
import { cn } from '../../../utils/cn'

const schema = z.object({
  login_id: z.string().min(1, 'Login ID is required'),
  password: z.string().min(1, 'Password is required'),
})

const ROLE_HOME = {
  admin: '/admin',
  sales_manager: '/sm',
  inventory_manager: '/im',
  dispatch_worker: '/dw',
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState(null)
  const { setUser } = useAuthStore()
  const { setUnreadCount } = useNotificationStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const res = await login(data.login_id, data.password)
      if (res.success) {
        localStorage.setItem('trackflow-refresh-token', res.data.refreshToken)
        setUser(res.data.user, res.data.accessToken)
        setUnreadCount(0)
        
        const homePath = ROLE_HOME[res.data.user.role] || '/login'
        navigate(homePath)
      } else {
        setServerError(res.error || 'Invalid login ID or password.')
      }
    } catch (err) {
      setServerError(err.message || 'Connection failed. Please ensure MySQL and the backend are running.')
    }
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight mb-2">
          Welcome back
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Sign in to your TrackFlow account to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login_id" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Login ID
          </label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              {...register('login_id')}
              id="login_id"
              type="text"
              autoComplete="username"
              placeholder="e.g. admin or sm_ravi"
              className={cn('input-base pl-9', errors.login_id && 'border-danger-500 focus:ring-danger-500')}
            />
          </div>
          {errors.login_id && <p className="text-xs text-danger-600 mt-1">{errors.login_id.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={cn('input-base pl-9 pr-10', errors.password && 'border-danger-500 focus:ring-danger-500')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              id="password-toggle-btn"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-danger-600 mt-1">{errors.password.message}</p>}
        </div>

        {serverError && (
          <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-3 py-2.5 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {serverError}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full mt-2" loading={isSubmitting} id="login-submit-btn">
          Sign In
        </Button>
      </form>

      <div className="mt-6 p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
        <p className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">Seeded Administrator</p>
        <p className="text-xs text-surface-500 font-mono">Login ID: admin / Password: admin123</p>
      </div>
    </div>
  )
}


