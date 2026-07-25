'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Brain, Stethoscope, LayoutDashboard, Users, TrendingUp, Megaphone,
  Calendar, FileText, Settings, Zap, Globe, ChartBar,
  Star, Package, LogOut, ChevronDown, Building2, Share2,
  Mail, CreditCard, BarChart3, MapPin, Palette, MessageCircle, Webhook,
  ClipboardList, MessageSquare, Clock, Wrench, GitBranch, Video, LineChart,
  PhoneCall, UserCircle, RefreshCw, Inbox, CalendarDays, DollarSign,
  Layers, FormInput, Map, BookOpen, MessageCircleDashed, Clock3, Gift,
  UserPlus, FileSignature, Award, ClipboardCheck, Box, ShieldCheck,
  Link2, Radio, BellRing, PenTool, ThumbsUp,
  Key, Shield, CalendarCheck, Bell,
  Receipt, Truck, Archive, Briefcase, Timer, FileCheck, ScrollText, Target, LayoutTemplate, UserCheck,
  BookMarked, Search, Store, FlaskConical, Zap as ZapDrip
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth.store'
import { Button } from '../ui/button'

type NavItem = {
  name: string
  href: string
  icon: React.ElementType
  badge?: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'AI Intelligence',
    items: [
      { name: 'Brain', href: '/dashboard/brain', icon: Brain, badge: 'AI' },
      { name: 'Business Doctor', href: '/dashboard/business-doctor', icon: Stethoscope, badge: 'AI' },
      { name: 'Receptionist', href: '/dashboard/receptionist', icon: PhoneCall, badge: 'AI' },
      { name: 'Email Writer', href: '/dashboard/email-writer', icon: PenTool, badge: 'AI' },
      { name: 'Blog Writer', href: '/dashboard/blog-writer', icon: BookMarked, badge: 'AI' },
      { name: 'Automations', href: '/dashboard/automations', icon: Zap },
    ],
  },
  {
    label: 'Core Business',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'CRM', href: '/dashboard/crm', icon: Users },
      { name: 'Sales', href: '/dashboard/sales', icon: TrendingUp },
      { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
      { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
      { name: 'Proposals', href: '/dashboard/proposals', icon: ClipboardList },
      { name: 'Estimates', href: '/dashboard/estimates', icon: FileCheck },
      { name: 'Contracts', href: '/dashboard/contracts', icon: ScrollText },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { name: 'Marketing', href: '/dashboard/marketing', icon: Megaphone },
      { name: 'Campaigns', href: '/dashboard/campaigns', icon: Mail },
      { name: 'Social', href: '/dashboard/social', icon: Share2 },
      { name: 'Content Calendar', href: '/dashboard/content-calendar', icon: CalendarDays },
      { name: 'Sequences', href: '/dashboard/sequences', icon: GitBranch },
      { name: 'Drip Campaigns', href: '/dashboard/drip-campaigns', icon: ZapDrip },
      { name: 'Broadcasts', href: '/dashboard/broadcasts', icon: Radio },
      { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
      { name: 'Testimonials', href: '/dashboard/testimonials', icon: Video },
      { name: 'Referrals', href: '/dashboard/referrals', icon: UserPlus },
      { name: 'Loyalty', href: '/dashboard/loyalty', icon: Award },
    ],
  },
  {
    label: 'Communication',
    items: [
      { name: 'Team Inbox', href: '/dashboard/team-inbox', icon: Inbox },
      { name: 'SMS Inbox', href: '/dashboard/sms', icon: MessageSquare },
      { name: 'WhatsApp', href: '/dashboard/whatsapp', icon: MessageCircle },
      { name: 'Chat Widget', href: '/dashboard/chat-widget', icon: MessageCircleDashed },
      { name: 'Push Notifications', href: '/dashboard/push-notifications', icon: BellRing },
    ],
  },
  {
    label: 'Finance',
    items: [
      { name: 'Billing', href: '/dashboard/billing', icon: Layers },
      { name: 'Subscriptions', href: '/dashboard/subscriptions', icon: CreditCard },
      { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt },
      { name: 'Job Costing', href: '/dashboard/job-costing', icon: Wrench },
      { name: 'Commissions', href: '/dashboard/commissions', icon: DollarSign },
      { name: 'Payment Links', href: '/dashboard/payment-links', icon: Link2 },
      { name: 'Gift Cards', href: '/dashboard/gift-cards', icon: Gift },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Operations', href: '/dashboard/operations', icon: Package },
      { name: 'Projects', href: '/dashboard/projects', icon: Briefcase },
      { name: 'Time Tracking', href: '/dashboard/time-tracking', icon: Timer },
      { name: 'Staff Schedule', href: '/dashboard/staff-schedule', icon: Clock },
      { name: 'Inventory', href: '/dashboard/inventory', icon: Archive },
      { name: 'Vendors', href: '/dashboard/vendors', icon: Truck },
      { name: 'Resources', href: '/dashboard/resources', icon: Box },
      { name: 'Documents', href: '/dashboard/documents', icon: FileSignature },
      { name: 'Forms', href: '/dashboard/forms', icon: FormInput },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBar },
      { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
      { name: 'Forecasting', href: '/dashboard/forecasting', icon: LineChart },
      { name: 'Goals', href: '/dashboard/goals', icon: Target },
      { name: 'CSAT Surveys', href: '/dashboard/csat', icon: ThumbsUp },
      { name: 'A/B Testing', href: '/dashboard/ab-testing', icon: FlaskConical },
    ],
  },
  {
    label: 'Clients',
    items: [
      { name: 'Client Portal', href: '/dashboard/client-portal', icon: UserCircle },
      { name: 'Client Onboarding', href: '/dashboard/client-onboarding', icon: UserCheck },
      { name: 'Intake Forms', href: '/dashboard/intake', icon: ClipboardCheck },
      { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: BookOpen },
      { name: 'Waitlist', href: '/dashboard/waitlist', icon: Clock3 },
      { name: 'Recurring Appts', href: '/dashboard/recurring-appointments', icon: RefreshCw },
    ],
  },
  {
    label: 'Platform',
    items: [
      { name: 'Website', href: '/dashboard/website', icon: Globe },
      { name: 'Locations', href: '/dashboard/locations', icon: MapPin },
      { name: 'Marketplace', href: '/dashboard/marketplace', icon: Store },
      { name: 'White Label', href: '/dashboard/white-label', icon: Palette },
      { name: 'Competitors', href: '/dashboard/competitor-intelligence', icon: Search },
      { name: 'Google Ads', href: '/dashboard/google-ads', icon: Target },
    ],
  },
]

const settingsNav: NavItem[] = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Team', href: '/dashboard/team-permissions', icon: Shield },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Audit Log', href: '/dashboard/audit-log', icon: ShieldCheck },
]

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150',
        isActive
          ? 'bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(6,182,212,0.2)]'
          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >
      <item.icon className={cn('h-3.5 w-3.5 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/80')} />
      <span className="flex-1 truncate">{item.name}</span>
      {item.badge && (
        <span className={cn(
          'rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide',
          isActive
            ? 'bg-primary/25 text-primary'
            : 'bg-kanavu-900/60 text-kanavu-400',
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, organization, logout } = useAuthStore()

  function isActive(item: NavItem) {
    if (item.href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(item.href)
  }

  return (
    <div className="flex h-screen w-56 flex-col border-r border-sidebar-border bg-sidebar shrink-0">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 px-4 border-b border-sidebar-border">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
          style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)', boxShadow: '0 0 16px rgba(6,182,212,0.35)' }}>
          <Brain className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <span className="text-sm font-bold text-foreground tracking-tight">Kanavu</span>
          <span className="text-sm font-bold text-primary tracking-tight"> AI</span>
        </div>
      </div>

      {/* Organization */}
      {organization && (
        <div className="px-3 pt-3 pb-1">
          <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors">
            <Building2 className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
            <span className="flex-1 truncate text-left font-medium">{organization.name}</span>
            <ChevronDown className="h-3 w-3 text-sidebar-foreground/30" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">
        {navGroups.map((group) => {
          const hasActive = group.items.some(isActive)
          return (
            <div key={group.label} className="mb-4">
              <p className={cn(
                'mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest',
                hasActive ? 'text-primary/70' : 'text-sidebar-foreground/30',
              )}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink key={item.href} item={item} isActive={isActive(item)} />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Settings + User */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
          Settings
        </p>
        <div className="space-y-0.5 mb-3">
          {settingsNav.map(item => (
            <NavLink key={item.href} item={item} isActive={isActive(item)} />
          ))}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 bg-sidebar-accent/50">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-sidebar-primary-foreground"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="truncate text-xs font-semibold text-sidebar-foreground leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-[10px] text-sidebar-foreground/40 leading-tight mt-0.5">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            className="h-6 w-6 shrink-0 text-sidebar-foreground/30 hover:text-sidebar-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
