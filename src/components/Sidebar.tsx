import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, BarChart3, Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavLinkProps {
  to: string
  icon: React.ReactNode
  label: string
  isActive: boolean
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon, label, isActive }) => {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <span className="flex-shrink-0">
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  )
}

export const Sidebar: React.FC = () => {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border shadow-sm">
      <div className="flex flex-col h-full">
        {/* Logo/Branding */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Ainaa Clinic</h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <NavLink
            to="/"
            icon={<Home size={20} />}
            label="Homepage"
            isActive={isActive('/')}
          />
          <NavLink
            to="/report/transaction"
            icon={<FileText size={20} />}
            label="Transaction Report"
            isActive={isActive('/report/transaction')}
          />
          <NavLink
            to="/upload"
            icon={<Upload size={20} />}
            label="Upload Data"
            isActive={isActive('/upload')}
          />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-muted-foreground text-center">
            v1.0.0
          </p>
        </div>
      </div>
    </aside>
  )
}
