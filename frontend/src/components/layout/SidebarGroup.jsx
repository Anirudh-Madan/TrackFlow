import { cn } from '../../utils/cn'

export default function SidebarGroup({ label, collapsed, children }) {
  if (collapsed) return <div className="space-y-0.5">{children}</div>

  return (
    <div className="pt-3">
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-surface-400 dark:text-surface-600 truncate">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
