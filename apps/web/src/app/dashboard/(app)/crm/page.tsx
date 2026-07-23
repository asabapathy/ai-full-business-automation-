'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Users, Filter, MoreHorizontal, Mail, Phone } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Badge } from '../../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Skeleton } from '../../../../components/ui/skeleton'
import { api } from '../../../../lib/api-client'
import { initials, formatRelativeTime } from '../../../../lib/utils'

interface Contact {
  id: string
  firstName: string
  lastName?: string
  email?: string
  phone?: string
  type: string
  status: string
  score: number
  createdAt: string
  company?: { id: string; name: string }
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'info',
  CONTACTED: 'secondary',
  QUALIFIED: 'warning',
  PROPOSAL_SENT: 'ai',
  WON: 'success',
  LOST: 'destructive',
}

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    const fetchContacts = async () => {
      setIsLoading(true)
      try {
        const result = await api.get<{ contacts: Contact[]; total: number }>('/crm/contacts', {
          q: search || undefined,
          status: statusFilter || undefined,
          limit: 50,
        })
        setContacts(result.contacts)
        setTotal(result.total)
      } catch {
        // placeholder data
        setContacts([
          { id: '1', firstName: 'John', lastName: 'Smith', email: 'john@example.com', phone: '555-0100', type: 'CUSTOMER', status: 'WON', score: 85, createdAt: new Date().toISOString() },
          { id: '2', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@example.com', phone: '555-0101', type: 'LEAD', status: 'NEW', score: 42, createdAt: new Date().toISOString() },
          { id: '3', firstName: 'Mike', lastName: 'Williams', email: 'mike@example.com', phone: '555-0102', type: 'PROSPECT', status: 'QUALIFIED', score: 71, createdAt: new Date().toISOString() },
        ])
        setTotal(3)
      } finally {
        setIsLoading(false)
      }
    }

    const timer = setTimeout(fetchContacts, 300)
    return () => clearTimeout(timer)
  }, [search, statusFilter])

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total.toLocaleString()} contacts total</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Contacts', value: total, color: 'text-blue-600' },
          { label: 'Active Leads', value: 34, color: 'text-amber-600' },
          { label: 'Customers', value: 189, color: 'text-green-600' },
          { label: 'Avg Score', value: '68/100', color: 'text-purple-600' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['', 'NEW', 'QUALIFIED', 'WON'].map(status => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {/* Contact List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="font-medium">No contacts yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first contact or let AI import them.</p>
            </div>
          ) : (
            <div className="divide-y">
              {contacts.map(contact => (
                <div key={contact.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors">
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {initials(contact.firstName, contact.lastName)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {contact.email && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="hidden sm:flex flex-col items-center">
                    <span className="text-xs font-semibold">{contact.score}</span>
                    <span className="text-[10px] text-muted-foreground">score</span>
                  </div>

                  {/* Status */}
                  <Badge variant={(STATUS_COLORS[contact.status] as never) ?? 'outline'} className="text-xs hidden sm:flex">
                    {contact.status.replace('_', ' ')}
                  </Badge>

                  {/* Time */}
                  <span className="text-xs text-muted-foreground hidden md:block">
                    {formatRelativeTime(contact.createdAt)}
                  </span>

                  {/* Actions */}
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
