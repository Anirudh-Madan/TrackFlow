import { Zap } from 'lucide-react'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-dvh flex bg-surface-50 dark:bg-surface-950">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[420px] flex-col justify-between p-10 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-white font-bold text-lg tracking-tight">TrackFlow</p>
              <p className="text-primary-200 text-xs">Enterprise ERP</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white leading-tight mb-4">
            The ERP built for<br />modern operations.
          </h1>
          <p className="text-primary-200 text-sm leading-relaxed">
            Manage orders, inventory, parties, payments and your entire supply chain from one unified platform.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { label: 'Orders processed', value: '24,000+' },
              { label: 'Active parties', value: '1,200+' },
              { label: 'SKUs managed', value: '8,500+' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-primary-200 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-primary-300">
          © {new Date().getFullYear()} TrackFlow. All rights reserved.
        </p>
      </div>

      {/* Right content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center">
              <Zap className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-surface-900 dark:text-surface-50">TrackFlow</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
