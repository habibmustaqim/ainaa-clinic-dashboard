import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/context/SidebarContext'
import {
  ChevronLeft,
  ChevronRight,
  Home,
  BarChart3,
  Users,
  Upload,
  TrendingUp,
  Target,
  Activity,
  FileText,
  Menu,
  X,
  User,
  Calendar,
  Package,
  CreditCard,
  Stethoscope,
  ClipboardList,
  MessageSquare,
  Shield,
  Database,
  Zap
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  path?: string
  badge?: string | number
  children?: NavItem[]
}

interface NavGroup {
  id: string
  title: string
  items: NavItem[]
}

const navigation: NavGroup[] = [
  {
    id: 'main',
    title: 'Main',
    items: [
      { id: 'home', label: 'Dashboard', icon: Home, path: '/' },
      { id: 'customers', label: 'Customers', icon: Users, path: '/customers' },
      { id: 'reporting', label: 'Reporting', icon: FileText, path: '/reporting' },
      { id: 'upload', label: 'Upload Data', icon: Upload, path: '/upload' },
    ]
  },
  {
    id: 'customer',
    title: 'Customer Analytics',
    items: [
      { id: 'profiles', label: 'Customer Profiles', icon: User, path: '/customers/profiles' },
      { id: 'segmentation', label: 'Segmentation', icon: Target, path: '/customers/segments' },
      { id: 'loyalty', label: 'Loyalty Program', icon: Shield, path: '/customers/loyalty' },
      { id: 'feedback', label: 'Feedback', icon: MessageSquare, path: '/customers/feedback', badge: 'New' },
    ]
  },
  {
    id: 'operations',
    title: 'Operations',
    items: [
      { id: 'appointments', label: 'Appointments', icon: Calendar, path: '/operations/appointments' },
      { id: 'inventory', label: 'Inventory', icon: Package, path: '/operations/inventory' },
      { id: 'services', label: 'Services', icon: Stethoscope, path: '/operations/services' },
      { id: 'staff', label: 'Staff Management', icon: ClipboardList, path: '/operations/staff' },
    ]
  },
  {
    id: 'marketing',
    title: 'Marketing',
    items: [
      { id: 'campaigns', label: 'Campaigns', icon: Zap, path: '/marketing/campaigns', badge: 3 },
      { id: 'performance', label: 'Performance', icon: Activity, path: '/marketing/performance' },
      { id: 'automation', label: 'Automation', icon: Database, path: '/marketing/automation' },
    ]
  },
]


export const CollapsibleSidebar: React.FC = () => {
  const location = useLocation()
  const { isCollapsed, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()

  const isActive = (path?: string) => {
    if (!path) return false
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const NavItemComponent: React.FC<{ item: NavItem; depth?: number }> = ({ item, depth = 0 }) => {
    const Icon = item.icon
    const active = isActive(item.path)

    return (
      <Link
        to={item.path || '#'}
        className={cn(
          'group flex items-center rounded-lg transition-all duration-200',
          'hover:bg-primary/10',
          active && 'bg-primary text-primary-foreground',
          !active && 'text-muted-foreground hover:text-foreground',
          isCollapsed && depth === 0 ? 'justify-center py-2' : 'gap-3 px-3 py-2',
          depth > 0 && 'ml-9'
        )}
      >
        <Icon className={cn(
          'flex-shrink-0 transition-colors',
          isCollapsed && depth === 0 ? 'w-5 h-5' : 'w-4 h-4'
        )} />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            {item.badge !== undefined && (
              <span className={cn(
                'px-2 py-0.5 text-xs rounded-full font-medium',
                typeof item.badge === 'number'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-primary text-primary-foreground'
              )}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-sidebar',
          'border-r border-sidebar-border',
          'transition-all duration-300 ease-in-out z-50',
          'flex flex-col',
          isCollapsed ? 'w-16' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">A</span>
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Ainaa Clinic</h2>
                <p className="text-xs text-muted-foreground">Dashboard</p>
              </div>
            </div>
          )}

          {/* Desktop Collapse Button */}
          <button
            onClick={toggleSidebar}
            className={cn(
              'hidden md:flex items-center justify-center w-8 h-8 rounded-lg',
              'hover:bg-accent transition-colors',
              isCollapsed && 'mx-auto'
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={toggleMobileSidebar}
            className="md:hidden p-1"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>


        {/* Navigation */}
        <nav className={cn('flex-1 overflow-y-auto space-y-6', isCollapsed ? 'p-2' : 'p-4')}>
          {navigation.map(group => (
            <div key={group.id}>
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map(item => (
                  <div key={item.id}>
                    <NavItemComponent item={item} />
                    {item.children && !isCollapsed && (
                      <div className="mt-1 space-y-1">
                        {item.children.map(child => (
                          <NavItemComponent key={child.id} item={child} depth={1} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileSidebar}
        className={cn(
          'fixed top-4 left-4 z-30 md:hidden',
          'w-10 h-10 rounded-lg bg-card',
          'border border-border',
          'flex items-center justify-center',
          'shadow-lg'
        )}
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>
    </>
  )
}