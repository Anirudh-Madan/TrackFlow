import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { LogOut, Rocket, Clock, ShieldCheck } from 'lucide-react'

const ROLE_LABELS = {
  sales_manager: 'Sales Manager',
  inventory_manager: 'Inventory Manager',
  dispatch_worker: 'Dispatch Worker',
}

export default function RolePlaceholderPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    localStorage.removeItem('trackflow-refresh-token')
    navigate('/login')
  }

  const roleName = ROLE_LABELS[user?.role] || user?.role || 'User'

  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-surface-900 text-surface-50 p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-success-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div className="w-full max-w-lg bg-surface-800/40 backdrop-blur-md rounded-3xl border border-surface-700/50 p-8 sm:p-10 shadow-2xl relative z-10 text-center space-y-8 animate-in">
        {/* Animated Rocket/Clock Graphic */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center bg-surface-700/40 rounded-2xl border border-surface-600/30 shadow-inner">
          <Rocket className="h-10 w-10 text-primary-400 animate-bounce" />
          <Clock className="absolute -top-1 -right-1 h-5 w-5 text-warning-400" />
        </div>

        {/* Text Details */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-950/50 border border-primary-500/20 text-xs font-semibold text-primary-400 uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5" />
            {roleName} Area
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Features Coming Soon
          </h1>
          <p className="text-sm text-surface-400 leading-relaxed max-w-md mx-auto">
            Welcome, <span className="font-semibold text-surface-200">{user?.name || 'User'}</span>! 
            The modules and tools for the <span className="text-primary-300 font-medium">{roleName}</span> role are currently under construction.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-surface-700/50 flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Button
            variant="secondary"
            onClick={handleLogout}
            icon={LogOut}
            className="w-full sm:w-auto"
            id="placeholder-logout-btn"
          >
            Log Out
          </Button>
        </div>
      </div>
    </div>
  )
}
