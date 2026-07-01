import { useUIStore } from '../../store/uiStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../utils/cn'
import SidebarGroup from './SidebarGroup'
import { SidebarItem, SidebarGroup as CollapsibleGroup } from './SidebarItem'
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  MapPin,
  Building2,
  Package,
  History,
  Warehouse,
  ShoppingCart,
  Truck,
  CreditCard,
  RefreshCcw,
  BarChart3,
  TrendingUp,
  ClipboardList,
  FileUp,
  Lightbulb,
  Bell,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  Plus,
  FileText,
} from 'lucide-react'

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()
  const { unreadCount } = useNotificationStore()
  const { user } = useAuthStore()

  const getPortalLabel = () => {
    if (!user) return 'Portal'
    if (user.role === 'admin' || user.role?.name === 'admin') return 'Admin Portal'
    if (user.role === 'inventory_manager' || user.role?.name === 'inventory_manager') return 'Inventory Workspace'
    if (user.role === 'sales_manager' || user.role?.name === 'sales_manager') return 'Sales Workspace'
    if (user.role === 'dispatch_worker' || user.role?.name === 'dispatch_worker') return 'Dispatch Workspace'
    return 'Portal'
  }

  const renderNavItems = () => {
    const roleName = typeof user?.role === 'object' ? user.role.name : user?.role;

    if (roleName === 'inventory_manager') {
      return (
        <>
          {/* Dashboard */}
          <SidebarGroup label="Overview" collapsed={sidebarCollapsed}>
            <SidebarItem
              to="/im/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              collapsed={sidebarCollapsed}
            />
          </SidebarGroup>

          {/* Operations */}
          <SidebarGroup label="Operations" collapsed={sidebarCollapsed}>
            <SidebarItem to="/im/products" icon={Package} label="Products & Stock" collapsed={sidebarCollapsed} />
            <CollapsibleGroup label="Inward Entries" icon={FileUp} collapsed={sidebarCollapsed} defaultOpen>
              <SidebarItem to="/im/inward/new" icon={Plus} label="New Inward" collapsed={sidebarCollapsed} />
              <SidebarItem to="/im/inward" icon={History} label="Inward History" collapsed={sidebarCollapsed} />
            </CollapsibleGroup>
          </SidebarGroup>

          {/* Fulfilment */}
          <SidebarGroup label="Fulfilment" collapsed={sidebarCollapsed}>
            <SidebarItem to="/im/orders/pending" icon={ShoppingCart} label="Pending Orders" collapsed={sidebarCollapsed} />
            <SidebarItem to="/im/challans" icon={FileText} label="Challans" collapsed={sidebarCollapsed} />
            <SidebarItem to="/im/reorder" icon={ClipboardList} label="Reorder List" collapsed={sidebarCollapsed} />
          </SidebarGroup>

          {/* Intelligence */}
          <SidebarGroup label="Intelligence" collapsed={sidebarCollapsed}>
            <CollapsibleGroup label="Reports" icon={BarChart3} collapsed={sidebarCollapsed} defaultOpen>
              <SidebarItem to="/im/reports/stock" icon={Warehouse} label="Stock Reports" collapsed={sidebarCollapsed} />
              <SidebarItem to="/im/reports/inward" icon={FileUp} label="Inward Reports" collapsed={sidebarCollapsed} />
            </CollapsibleGroup>
          </SidebarGroup>

          {/* System */}
          <SidebarGroup label="System" collapsed={sidebarCollapsed}>
            <SidebarItem
              to="/im/notifications"
              icon={Bell}
              label="Notifications"
              badge={unreadCount}
              collapsed={sidebarCollapsed}
            />
          </SidebarGroup>
        </>
      );
    }

    // Default: Admin menu
    return (
      <>
        {/* Dashboard */}
        <SidebarGroup label="Overview" collapsed={sidebarCollapsed}>
          <SidebarItem
            to="/admin"
            end
            icon={LayoutDashboard}
            label="Dashboard"
            collapsed={sidebarCollapsed}
          />
        </SidebarGroup>

        {/* Users & Roles */}
        <SidebarGroup label="Access" collapsed={sidebarCollapsed}>
          <SidebarItem
            to="/admin/users"
            icon={Users}
            label="Users & Roles"
            collapsed={sidebarCollapsed}
          />
        </SidebarGroup>

        {/* Operations */}
        <SidebarGroup label="Operations" collapsed={sidebarCollapsed}>
          <SidebarItem to="/admin/regions" icon={MapPin} label="Regions" collapsed={sidebarCollapsed} />
          <SidebarItem to="/admin/parties" icon={Building2} label="Parties" collapsed={sidebarCollapsed} />
          <SidebarItem to="/admin/products" icon={Package} label="Products & Inventory" collapsed={sidebarCollapsed} />
        </SidebarGroup>

        {/* Fulfilment */}
        <SidebarGroup label="Fulfilment" collapsed={sidebarCollapsed}>
          <SidebarItem to="/admin/orders" icon={ShoppingCart} label="Orders & Challans" collapsed={sidebarCollapsed} />
          <SidebarItem to="/admin/dispatch" icon={Truck} label="Dispatch" collapsed={sidebarCollapsed} />
          <SidebarItem to="/admin/payments" icon={CreditCard} label="Payments & Finance" collapsed={sidebarCollapsed} />
        </SidebarGroup>

        {/* Intelligence */}
        <SidebarGroup label="Intelligence" collapsed={sidebarCollapsed}>
          <CollapsibleGroup label="Reports" icon={BarChart3} collapsed={sidebarCollapsed} defaultOpen>
            <SidebarItem to="/admin/reports/sales" icon={TrendingUp} label="Sales Reports" collapsed={sidebarCollapsed} />
            <SidebarItem to="/admin/reports/stock" icon={Warehouse} label="Stock Reports" collapsed={sidebarCollapsed} />
            <SidebarItem to="/admin/reports/audit" icon={ClipboardList} label="Audit Logs" collapsed={sidebarCollapsed} />
            <SidebarItem to="/admin/reports/imports" icon={FileUp} label="Import History" collapsed={sidebarCollapsed} />
            <SidebarItem to="/admin/reports/suggestions" icon={Lightbulb} label="Suggestion Conversion" collapsed={sidebarCollapsed} />
          </CollapsibleGroup>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup label="System" collapsed={sidebarCollapsed}>
          <SidebarItem
            to="/admin/notifications"
            icon={Bell}
            label="Notifications"
            badge={unreadCount}
            collapsed={sidebarCollapsed}
          />
          <SidebarItem to="/admin/settings" icon={Settings} label="Settings" collapsed={sidebarCollapsed} />
        </SidebarGroup>
      </>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-surface-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      <aside
        id="admin-sidebar"
        className={cn(
          'flex flex-col h-full bg-white dark:bg-surface-900',
          'border-r border-surface-200 dark:border-surface-800',
          'sidebar-transition overflow-hidden shrink-0',
          // Mobile: fixed offcanvas
          'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:transform-none md:flex',
          mobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0',
          // Desktop: collapsible width
          sidebarCollapsed ? 'md:w-16' : 'md:w-60'
        )}
      >
      {/* ── Logo ── */}
      <div
        className={cn(
          'flex items-center h-14 px-4 border-b border-surface-200 dark:border-surface-800 shrink-0',
          sidebarCollapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-md shadow-primary-500/30">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <p className="text-sm font-bold text-surface-900 dark:text-surface-50 tracking-tight">
                TrackFlow
              </p>
              <p className="text-[10px] text-surface-400 dark:text-surface-500 font-medium">
                {getPortalLabel()}
              </p>
            </div>
          </div>
        )}

        {sidebarCollapsed && (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-md shadow-primary-500/30">
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
        )}

        {!sidebarCollapsed && (
          <button
            id="sidebar-toggle-btn"
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-colors"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
        {renderNavItems()}
      </nav>

      {/* ── Expand button when collapsed ── */}
      {sidebarCollapsed && (
        <div className="px-2 pb-3">
          <button
            id="sidebar-expand-btn"
            onClick={toggleSidebar}
            className="w-full flex justify-center p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-colors"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
    </>
  )
}

