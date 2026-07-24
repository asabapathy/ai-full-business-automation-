'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Brain, Stethoscope, LayoutDashboard, Users, TrendingUp, Megaphone,
  Calendar, FileText, Settings, Zap, Globe, ChartBar,
  Star, Package, LogOut, ChevronDown, Building2, Share2,
  Mail, CreditCard, BarChart3, MapPin, Palette, Phone, MessageCircle, Webhook,
  ClipboardList, MessageSquare, Clock, Wrench, GitBranch, Video, LineChart,
  PhoneCall, UserCircle, RefreshCw, Inbox, CalendarDays, DollarSign,
  Layers, FormInput, Map, BookOpen, MessageCircleDashed, Clock3, Gift,
  UserPlus, FileSignature, Zap as ZapDrip, Award, ClipboardCheck, Box, ShieldCheck,
  Link2, Radio, BellRing, MessageCircle as WAIcon, PenTool, ThumbsUp,
  Key, Shield, CalendarCheck, Bell,
  Receipt, Truck, Archive, Briefcase, Timer, FileCheck, ScrollText, Target, LayoutTemplate, UserCheck
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth.store'
import { Button } from '../ui/button'

const navigation = [
  { name: 'Brain', href: '/dashboard/brain', icon: Brain, badge: 'AI' },
  { name: 'Business Doctor', href: '/dashboard/business-doctor', icon: Stethoscope, badge: 'AI' },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'CRM', href: '/dashboard/crm', icon: Users },
  { name: 'Sales', href: '/dashboard/sales', icon: TrendingUp },
  { name: 'Marketing', href: '/dashboard/marketing', icon: Megaphone },
  { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
  { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { name: 'Website', href: '/dashboard/website', icon: Globe },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBar },
  { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { name: 'Operations', href: '/dashboard/operations', icon: Package },
  { name: 'Automations', href: '/dashboard/automations', icon: Zap },
  { name: 'Social', href: '/dashboard/social', icon: Share2 },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: Mail },
  { name: 'Subscriptions', href: '/dashboard/subscriptions', icon: CreditCard },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Locations', href: '/dashboard/locations', icon: MapPin },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
  { name: 'Proposals', href: '/dashboard/proposals', icon: ClipboardList },
  { name: 'SMS Inbox', href: '/dashboard/sms', icon: MessageSquare },
  { name: 'Staff Schedule', href: '/dashboard/staff-schedule', icon: Clock },
  { name: 'Job Costing', href: '/dashboard/job-costing', icon: Wrench },
  { name: 'Sequences', href: '/dashboard/sequences', icon: GitBranch },
  { name: 'Testimonials', href: '/dashboard/testimonials', icon: Video },
  { name: 'Forecasting', href: '/dashboard/forecasting', icon: LineChart },
  { name: 'Receptionist', href: '/dashboard/receptionist', icon: PhoneCall },
  { name: 'Client Portal', href: '/dashboard/client-portal', icon: UserCircle },
  { name: 'Recurring Appts', href: '/dashboard/recurring-appointments', icon: RefreshCw },
  { name: 'Team Inbox', href: '/dashboard/team-inbox', icon: Inbox },
  { name: 'Content Calendar', href: '/dashboard/content-calendar', icon: CalendarDays },
  { name: 'Commissions', href: '/dashboard/commissions', icon: DollarSign },
  { name: 'Billing', href: '/dashboard/billing', icon: Layers },
  { name: 'Forms', href: '/dashboard/forms', icon: FormInput },
  { name: 'Location Reports', href: '/dashboard/location-reports', icon: Map },
  { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: BookOpen },
  { name: 'Chat Widget', href: '/dashboard/chat-widget', icon: MessageCircleDashed },
  { name: 'Waitlist', href: '/dashboard/waitlist', icon: Clock3 },
  { name: 'Gift Cards', href: '/dashboard/gift-cards', icon: Gift },
  { name: 'Referrals', href: '/dashboard/referrals', icon: UserPlus },
  { name: 'Documents', href: '/dashboard/documents', icon: FileSignature },
  { name: 'Drip Campaigns', href: '/dashboard/drip-campaigns', icon: ZapDrip },
  { name: 'Loyalty', href: '/dashboard/loyalty', icon: Award },
  { name: 'Intake Forms', href: '/dashboard/intake', icon: ClipboardCheck },
  { name: 'Resources', href: '/dashboard/resources', icon: Box },
  { name: 'Audit Log', href: '/dashboard/audit-log', icon: ShieldCheck },
  { name: 'Payment Links', href: '/dashboard/payment-links', icon: Link2 },
  { name: 'Broadcasts', href: '/dashboard/broadcasts', icon: Radio },
  { name: 'Push Notifications', href: '/dashboard/push-notifications', icon: BellRing },
  { name: 'WhatsApp', href: '/dashboard/whatsapp', icon: MessageCircle },
  { name: 'Email Writer', href: '/dashboard/email-writer', icon: PenTool },
  { name: 'CSAT Surveys', href: '/dashboard/csat', icon: ThumbsUp },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Team Permissions', href: '/dashboard/team-permissions', icon: Shield },
  { name: 'Calendar Sync', href: '/dashboard/calendar-sync', icon: CalendarCheck },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt },
  { name: 'Vendors', href: '/dashboard/vendors', icon: Truck },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Archive },
  { name: 'Projects', href: '/dashboard/projects', icon: Briefcase },
  { name: 'Time Tracking', href: '/dashboard/time-tracking', icon: Timer },
  { name: 'Estimates', href: '/dashboard/estimates', icon: FileCheck },
  { name: 'Contracts', href: '/dashboard/contracts', icon: ScrollText },
  { name: 'Goals', href: '/dashboard/goals', icon: Target },
  { name: 'Email Templates', href: '/dashboard/email-templates', icon: LayoutTemplate },
  { name: 'Client Onboarding', href: '/dashboard/client-onboarding', icon: UserCheck },
]

const bottomNav = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, organization, logout } = useAuthStore()

  return (
    <div className="flex h-screen w-60 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Brain className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sidebar-foreground">Kanavu AI</span>
      </div>

      {/* Organization Selector */}
      {organization && (
        <div className="px-3 pt-3">
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <Building2 className="h-4 w-4 text-sidebar-foreground/60" />
            <span className="flex-1 truncate text-left font-medium">{organization.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {navigation.map(item => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="rounded-full bg-kanavu-100 px-1.5 py-0.5 text-[10px] font-semibold text-kanavu-700 dark:bg-kanavu-900/30 dark:text-kanavu-300">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t px-3 py-3 space-y-0.5">
        {bottomNav.map(item => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        ))}

        {/* User */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-xs font-medium text-sidebar-foreground">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-[10px] text-sidebar-foreground/50">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => logout()} className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
