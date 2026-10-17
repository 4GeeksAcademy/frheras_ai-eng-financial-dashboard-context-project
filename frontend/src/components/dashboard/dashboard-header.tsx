import { LayoutDashboard, GitCompareArrows } from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface DashboardHeaderProps {
  period: string
}

export function DashboardHeader({ period }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LayoutDashboard size={18} />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Financial Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Executive metrics dashboard</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-0.5 text-xs">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <LayoutDashboard size={14} />
            Dashboard
          </NavLink>
          <NavLink
            to="/comparison"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <GitCompareArrows size={14} />
            B2B vs B2C
          </NavLink>
        </nav>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {period}
        </span>
      </div>
    </header>
  )
}
