import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, BarChart3, Upload } from 'lucide-react'
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
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <span className={cn('flex-shrink-0', isActive ? 'text-white' : 'text-slate-500')}>
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
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 shadow-sm">
      <div className="flex flex-col h-full">
        {/* Logo/Branding */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Ainaa Clinic</h1>
              <p className="text-xs text-slate-500">Dashboard</p>
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
            to="/analytics"
            icon={<BarChart3 size={20} />}
            label="Analytics"
            isActive={isActive('/analytics')}
          />
          <NavLink
            to="/upload"
            icon={<Upload size={20} />}
            label="Upload Data"
            isActive={isActive('/upload')}
          />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          <p className="text-xs text-slate-400 text-center">
            v1.0.0
          </p>
        </div>
      </div>
    </aside>
  )
}
