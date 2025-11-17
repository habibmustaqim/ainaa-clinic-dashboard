import React from 'react'
import { CollapsibleSidebar } from './navigation/CollapsibleSidebar'
import { TopBar } from './navigation/TopBar'
import { useSidebar } from '@/context/SidebarContext'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isCollapsed } = useSidebar()

  return (
    <div className="min-h-screen bg-background dark:bg-black">
      <div className="flex">
        {/* Collapsible Sidebar */}
        <CollapsibleSidebar />

        {/* Main Content Area with TopBar */}
        <div
          className={cn(
            'flex-1 flex flex-col transition-all duration-300',
            isCollapsed ? 'md:ml-16' : 'md:ml-64',
            'ml-0' // No margin on mobile since sidebar is absolutely positioned
          )}
        >
          {/* Top Bar */}
          <TopBar />

          {/* Main Content */}
          <main className="flex-1">
            <div className="p-4 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
