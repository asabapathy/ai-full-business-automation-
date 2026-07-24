import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Linking, Alert,
} from 'react-native'
import { api } from '../lib/api'
import { format } from 'date-fns'

interface CustomerAppointment {
  id: string
  title: string
  startTime: string
  endTime: string
  status: string
  duration: number
  serviceName?: string
}

interface CustomerInvoice {
  id: string
  invoiceNumber: string
  total: number
  status: string
  dueDate?: string
  paymentUrl?: string
}

type Tab = 'appointments' | 'invoices'

export default function CustomerPortalScreen() {
  const [tab, setTab] = useState<Tab>('appointments')
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([])
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [apptData, invData] = await Promise.all([
        api.get<{ appointments: CustomerAppointment[] }>('/portal/appointments').catch(() => ({ appointments: [] as CustomerAppointment[] })),
        api.get<{ invoices: CustomerInvoice[] }>('/portal/invoices').catch(() => ({ invoices: [] as CustomerInvoice[] })),
      ])
      setAppointments(apptData.appointments ?? [])
      setInvoices(invData.invoices ?? [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const onRefresh = () => { setRefreshing(true); void load() }

  const handlePayInvoice = async (invoice: CustomerInvoice) => {
    if (invoice.paymentUrl) {
      const canOpen = await Linking.canOpenURL(invoice.paymentUrl)
      if (canOpen) {
        await Linking.openURL(invoice.paymentUrl)
      }
    } else {
      Alert.alert('Payment', 'Payment link not available. Please contact the business.')
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: '#3b82f6',
    COMPLETED: '#22c55e',
    CANCELED: '#ef4444',
    NO_SHOW: '#f59e0b',
    PAID: '#22c55e',
    UNPAID: '#f59e0b',
    OVERDUE: '#ef4444',
    DRAFT: '#6b7280',
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'appointments' && styles.tabActive]}
          onPress={() => setTab('appointments')}
        >
          <Text style={[styles.tabText, tab === 'appointments' && styles.tabTextActive]}>Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'invoices' && styles.tabActive]}
          onPress={() => setTab('invoices')}
        >
          <Text style={[styles.tabText, tab === 'invoices' && styles.tabTextActive]}>Invoices</Text>
          {invoices.filter(i => i.status === 'UNPAID' || i.status === 'OVERDUE').length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {invoices.filter(i => i.status === 'UNPAID' || i.status === 'OVERDUE').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {tab === 'appointments' ? (
          appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No appointments yet</Text>
            </View>
          ) : (
            appointments.map(appt => {
              const color = STATUS_COLORS[appt.status] ?? '#6b7280'
              const start = new Date(appt.startTime)
              return (
                <View key={appt.id} style={styles.card}>
                  <View style={[styles.colorBar, { backgroundColor: color }]} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{appt.title}</Text>
                      <View style={[styles.pill, { backgroundColor: `${color}22` }]}>
                        <Text style={[styles.pillText, { color }]}>{appt.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardSub}>
                      {format(start, 'EEE, MMM d')} · {format(start, 'h:mm a')} · {appt.duration} min
                    </Text>
                    {appt.serviceName && <Text style={styles.cardSub2}>Service: {appt.serviceName}</Text>}
                  </View>
                </View>
              )
            })
          )
        ) : (
          invoices.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyText}>No invoices yet</Text>
            </View>
          ) : (
            invoices.map(inv => {
              const color = STATUS_COLORS[inv.status] ?? '#6b7280'
              const isPending = inv.status === 'UNPAID' || inv.status === 'OVERDUE'
              return (
                <View key={inv.id} style={styles.card}>
                  <View style={[styles.colorBar, { backgroundColor: color }]} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardTitle}>#{inv.invoiceNumber}</Text>
                      <View style={[styles.pill, { backgroundColor: `${color}22` }]}>
                        <Text style={[styles.pillText, { color }]}>{inv.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardTotal}>${(inv.total ?? 0).toLocaleString()}</Text>
                    {inv.dueDate && (
                      <Text style={styles.cardSub}>Due: {format(new Date(inv.dueDate), 'MMM d, yyyy')}</Text>
                    )}
                    {isPending && (
                      <TouchableOpacity style={styles.payBtn} onPress={() => handlePayInvoice(inv)}>
                        <Text style={styles.payBtnText}>Pay Now →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )
            })
          )
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e293b', backgroundColor: '#0f172a' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#64748b' },
  tabTextActive: { color: '#6366f1', fontWeight: '700' },
  badge: { backgroundColor: '#6366f1', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, flexDirection: 'row', overflow: 'hidden' },
  colorBar: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#f1f5f9', flex: 1 },
  cardTotal: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cardSub: { fontSize: 12, color: '#94a3b8' },
  cardSub2: { fontSize: 12, color: '#64748b' },
  payBtn: { marginTop: 8, backgroundColor: '#4f46e5', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' },
  payBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, color: '#475569', fontWeight: '500' },
})
