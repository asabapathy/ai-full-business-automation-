'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  BookMarked, Search, Store, FlaskConical, Zap as ZapDrip,
  Lock,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth.store'
import { Button } from '../ui/button'
import { type Feature, getOrgFeatures, isHipaaIndustry } from '../../lib/features'
import { useMemo } from 'react'

type NavItem = {
  name: string
  href: string
  icon: React.ElementType
  badge?: string
  feature?: Feature
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: '① Get Started',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, feature: 'core:dashboard' },
      { name: 'Brain', href: '/dashboard/brain', icon: Brain, badge: 'AI', feature: 'ai:brain' },
      { name: 'Business Doctor', href: '/dashboard/business-doctor', icon: Stethoscope, badge: 'AI', feature: 'ai:business_doctor' },
    ],
  },
  {
    label: '② Your Customers',
    items: [
      { name: 'CRM', href: '/dashboard/crm', icon: Users, feature: 'core:crm' },
      { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar, feature: 'core:appointments' },
      { name: 'Client Portal', href: '/dashboard/client-portal', icon: UserCircle, feature: 'clients:portal' },
      { name: 'Intake Forms', href: '/dashboard/intake', icon: ClipboardCheck, feature: 'clients:intake' },
      { name: 'Recurring Appts', href: '/dashboard/recurring-appointments', icon: RefreshCw, feature: 'clients:recurring' },
      { name: 'Client Onboarding', href: '/dashboard/client-onboarding', icon: UserCheck, feature: 'clients:onboarding' },
      { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: BookOpen, feature: 'clients:knowledge_base' },
      { name: 'Waitlist', href: '/dashboard/waitlist', icon: Clock3, feature: 'clients:waitlist' },
    ],
  },
  {
    label: '③ Get Found',
    items: [
      { name: 'Receptionist', href: '/dashboard/receptionist', icon: PhoneCall, badge: 'AI', feature: 'ai:receptionist' },
      { name: 'Website', href: '/dashboard/website', icon: Globe, feature: 'platform:website' },
      { name: 'Reviews', href: '/dashboard/reviews', icon: Star, feature: 'reputation:reviews' },
      { name: 'Referrals', href: '/dashboard/referrals', icon: UserPlus, feature: 'reputation:referrals' },
      { name: 'Testimonials', href: '/dashboard/testimonials', icon: Video, feature: 'reputation:testimonials' },
    ],
  },
  {
    label: '④ Close & Get Paid',
    items: [
      { name: 'Sales', href: '/dashboard/sales', icon: TrendingUp, feature: 'core:sales' },
      { name: 'Proposals', href: '/dashboard/proposals', icon: ClipboardList, feature: 'core:proposals' },
      { name: 'Estimates', href: '/dashboard/estimates', icon: FileCheck, feature: 'core:estimates' },
      { name: 'Contracts', href: '/dashboard/contracts', icon: ScrollText, feature: 'core:contracts' },
      { name: 'Invoices', href: '/dashboard/invoices', icon: FileText, feature: 'core:invoices' },
      { name: 'Catalog', href: '/dashboard/catalog', icon: Package },
      { name: 'Payment Links', href: '/dashboard/payment-links', icon: Link2, feature: 'finance:payment_links' },
      { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
      { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt },
      { name: 'Subscriptions', href: '/dashboard/subscriptions', icon: CreditCard, feature: 'finance:subscriptions' },
      { name: 'Gift Cards', href: '/dashboard/gift-cards', icon: Gift, feature: 'finance:gift_cards' },
      { name: 'Billing', href: '/dashboard/billing', icon: Layers, feature: 'finance:billing' },
    ],
  },
  {
    label: '⑤ Engage & Retain',
    items: [
      { name: 'Inbox', href: '/dashboard/inbox', icon: Inbox },
      { name: 'Automations', href: '/dashboard/automations', icon: Zap, feature: 'core:automations' },
      { name: 'Campaigns', href: '/dashboard/campaigns', icon: Mail, feature: 'marketing:campaigns' },
      { name: 'Templates', href: '/dashboard/templates', icon: FileText },
      { name: 'Sequences', href: '/dashboard/sequences', icon: GitBranch, feature: 'marketing:sequences' },
      { name: 'Drip Campaigns', href: '/dashboard/drip-campaigns', icon: ZapDrip, feature: 'marketing:drip' },
      { name: 'Broadcasts', href: '/dashboard/broadcasts', icon: Radio, feature: 'marketing:broadcasts' },
      { name: 'Loyalty', href: '/dashboard/loyalty', icon: Award, feature: 'reputation:loyalty' },
      { name: 'Team Inbox', href: '/dashboard/team-inbox', icon: Inbox, feature: 'comm:team_inbox' },
      { name: 'SMS Inbox', href: '/dashboard/sms', icon: MessageSquare, feature: 'comm:sms' },
      { name: 'WhatsApp', href: '/dashboard/whatsapp', icon: MessageCircle, feature: 'comm:whatsapp' },
      { name: 'Chat Widget', href: '/dashboard/chat-widget', icon: MessageCircleDashed, feature: 'comm:chat_widget' },
      { name: 'Push Notifications', href: '/dashboard/push-notifications', icon: BellRing, feature: 'comm:push' },
    ],
  },
  {
    label: '⑥ Grow',
    items: [
      { name: 'Marketing', href: '/dashboard/marketing', icon: Megaphone, feature: 'marketing:hub' },
      { name: 'Email Writer', href: '/dashboard/email-writer', icon: PenTool, badge: 'AI', feature: 'ai:email_writer' },
      { name: 'Blog Writer', href: '/dashboard/blog-writer', icon: BookMarked, badge: 'AI', feature: 'ai:blog_writer' },
      { name: 'Social', href: '/dashboard/social', icon: Share2, feature: 'marketing:social' },
      { name: 'Content Calendar', href: '/dashboard/content-calendar', icon: CalendarDays, feature: 'marketing:content_calendar' },
      { name: 'Google Ads', href: '/dashboard/google-ads', icon: Target, feature: 'platform:google_ads' },
      { name: 'Competitors', href: '/dashboard/competitor-intelligence', icon: Search, feature: 'platform:competitors' },
      { name: 'A/B Testing', href: '/dashboard/ab-testing', icon: FlaskConical, feature: 'analytics:ab_testing' },
    ],
  },
  {
    label: '⑦ Run the Business',
    items: [
      { name: 'Operations', href: '/dashboard/operations', icon: Package, feature: 'ops:hub' },
      { name: 'Staff Schedule', href: '/dashboard/staff-schedule', icon: Clock, feature: 'ops:staff_schedule' },
      { name: 'Projects', href: '/dashboard/projects', icon: Briefcase, feature: 'ops:projects' },
      { name: 'Time Tracking', href: '/dashboard/time-tracking', icon: Timer, feature: 'ops:time_tracking' },
      { name: 'Inventory', href: '/dashboard/inventory', icon: Archive, feature: 'ops:inventory' },
      { name: 'Vendors', href: '/dashboard/vendors', icon: Truck },
      { name: 'Resources', href: '/dashboard/resources', icon: Box, feature: 'ops:resources' },
      { name: 'Job Costing', href: '/dashboard/job-costing', icon: Wrench, feature: 'finance:job_costing' },
      { name: 'Commissions', href: '/dashboard/commissions', icon: DollarSign, feature: 'finance:commissions' },
      { name: 'Documents', href: '/dashboard/documents', icon: FileSignature, feature: 'ops:documents' },
      { name: 'Forms', href: '/dashboard/forms', icon: FormInput, feature: 'ops:forms' },
    ],
  },
  {
    label: '⑧ Measure',
    items: [
      { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBar, feature: 'analytics:hub' },
      { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, feature: 'analytics:reports' },
      { name: 'Forecasting', href: '/dashboard/forecasting', icon: LineChart, feature: 'analytics:forecasting' },
      { name: 'Goals', href: '/dashboard/goals', icon: Target, feature: 'analytics:goals' },
      { name: 'CSAT Surveys', href: '/dashboard/csat', icon: ThumbsUp, feature: 'analytics:csat' },
    ],
  },
  {
    label: '⑨ Scale',
    items: [
      { name: 'White Label', href: '/dashboard/white-label', icon: Palette, feature: 'platform:white_label' },
      { name: 'Locations', href: '/dashboard/locations', icon: MapPin, feature: 'platform:locations' },
      { name: 'Marketplace', href: '/dashboard/marketplace', icon: Store, feature: 'platform:marketplace' },
    ],
  },
]

const settingsNav: NavItem[] = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, feature: 'settings:settings' },
  { name: 'Team', href: '/dashboard/team-permissions', icon: Shield, feature: 'settings:team' },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key, feature: 'settings:api_keys' },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook, feature: 'settings:webhooks' },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, feature: 'settings:notifications' },
  { name: 'Audit Log', href: '/dashboard/audit-log', icon: ShieldCheck, feature: 'settings:audit_log' },
]

function NavLink({ item, isActive, locked, hipaaHidden }: { item: NavItem; isActive: boolean; locked: boolean; hipaaHidden: boolean }) {
  const router = useRouter()

  if (hipaaHidden) return null

  function handleClick(e: React.MouseEvent) {
    if (locked) {
      e.preventDefault()
      router.push(`/dashboard/upgrade?feature=${encodeURIComponent(item.feature ?? '')}`)
    }
  }

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150',
        isActive && !locked
          ? 'bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(6,182,212,0.2)]'
          : locked
          ? 'text-sidebar-foreground/30 cursor-pointer'
          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >
      <item.icon className={cn('h-3.5 w-3.5 shrink-0 transition-colors', isActive && !locked ? 'text-primary' : locked ? 'text-sidebar-foreground/20' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/80')} />
      <span className="flex-1 truncate">{item.name}</span>
      {locked ? (
        <Lock className="h-3 w-3 text-sidebar-foreground/20 shrink-0" />
      ) : item.badge ? (
        <span className={cn(
          'rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide',
          isActive ? 'bg-primary/25 text-primary' : 'bg-kanavu-900/60 text-kanavu-400',
        )}>
          {item.badge}
        </span>
      ) : null}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, organization, logout } = useAuthStore()

  const orgFeatures = useMemo(
    () => getOrgFeatures(organization?.plan ?? 'STARTER', organization?.industry),
    [organization?.plan, organization?.industry],
  )
  const hipaa = useMemo(() => isHipaaIndustry(organization?.industry), [organization?.industry])

  function isActive(item: NavItem) {
    if (item.href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(item.href)
  }

  function isLocked(item: NavItem): boolean {
    if (!item.feature) return false
    return !orgFeatures.has(item.feature)
  }

  function isHipaaHidden(item: NavItem): boolean {
    if (!hipaa || !item.feature) return false
    return !orgFeatures.has(item.feature)
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
          {/* Plan badge */}
          <div className="px-2.5 mt-1">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }}>
              {organization.plan?.toUpperCase() ?? 'STARTER'}
            </span>
            {hipaa && (
              <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                HIPAA-safe
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(item => !isHipaaHidden(item))
          if (visibleItems.length === 0) return null
          const hasActive = visibleItems.some(i => isActive(i) && !isLocked(i))
          return (
            <div key={group.label} className="mb-4">
              <p className={cn(
                'mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest',
                hasActive ? 'text-primary/70' : 'text-sidebar-foreground/30',
              )}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(item => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isActive(item)}
                    locked={isLocked(item)}
                    hipaaHidden={false}
                  />
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
          {settingsNav.filter(item => !isHipaaHidden(item)).map(item => (
            <NavLink key={item.href} item={item} isActive={isActive(item)} locked={isLocked(item)} hipaaHidden={false} />
          ))}
        </div>

        {/* Upgrade prompt if on Starter */}
        {organization?.plan?.toUpperCase() === 'STARTER' && (
          <Link href="/pricing" className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-2 transition-colors hover:bg-sidebar-accent" style={{ border: '1px dashed rgba(6,182,212,0.3)' }}>
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">Upgrade to Pro</span>
          </Link>
        )}

        {/* Super-admin link */}
        {user?.isSuperAdmin && (
          <Link href="/admin" className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-2 transition-colors hover:bg-sidebar-accent" style={{ border: '1px solid rgba(251,191,36,0.3)' }}>
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: '#fbbf24' }} />
            <span className="text-xs font-medium" style={{ color: '#fbbf24' }}>Owner Portal</span>
          </Link>
        )}

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
