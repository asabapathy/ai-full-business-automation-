'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Brain, LayoutDashboard, Building2, LogOut, ShieldCheck, Users, Settings } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../lib/utils'

const adminNav = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Businesses', href: '/admin/businesses', icon: Building2 },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return }
    if (!user?.isSuperAdmin) { router.replace('/dashboard'); return }
  }, [isAuthenticated, user?.isSuperAdmin])

  if (!user?.isSuperAdmin) return null

  return (
    <div className="flex h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Admin sidebar */}
      <div className="w-56 shrink-0 flex flex-col h-screen" style={{ background: 'hsl(var(--sidebar))', borderRight: '1px solid hsl(var(--border))' }}>
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 px-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 16px rgba(245,158,11,0.3)' }}>
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-none">Owner Portal</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Kanavu AI Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {adminNav.map(item => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all',
                  active
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                )}
                style={active ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' } : undefined}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Back to app + user */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[10px] text-muted-foreground truncate">Super Admin</p>
            </div>
            <button onClick={() => logout()} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
