import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

interface BusinessContext {
  revenue30d: number
  newContacts30d: number
  pipelineValue: number
  activeDeals: number
  appointmentsToday: number
  avgRating: number
  totalReviews: number
  alerts: Array<{ type: string; message: string }>
}

interface StatCardProps {
  label: string
  value: string
  icon: string
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function DashboardScreen() {
  const { user, organization, logout } = useAuthStore()
  const [context, setContext] = useState<BusinessContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const data = await api.get<BusinessContext>('/ai/context')
      setContext(data)
    } catch {
      // Use demo data if API not available
      setContext({
        revenue30d: 12450,
        newContacts30d: 23,
        pipelineValue: 48000,
        activeDeals: 7,
        appointmentsToday: 4,
        avgRating: 4.7,
        totalReviews: 142,
        alerts: [{ type: 'warning', message: '2 overdue invoices' }],
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [])

  const onRefresh = () => {
    setRefreshing(true)
    void load()
  }

  const formatCurrency = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.firstName} 👋</Text>
          <Text style={styles.orgName}>{organization?.name}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts */}
      {context?.alerts && context.alerts.length > 0 && (
        <View style={styles.alertsSection}>
          {context.alerts.map((alert, i) => (
            <View key={i} style={[styles.alert, alert.type === 'warning' ? styles.alertWarning : styles.alertInfo]}>
              <Text style={styles.alertText}>
                {alert.type === 'warning' ? '⚠️' : 'ℹ️'} {alert.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Stats grid */}
      <Text style={styles.sectionTitle}>Last 30 days</Text>
      <View style={styles.statsGrid}>
        <StatCard
          label="Revenue"
          value={formatCurrency(context?.revenue30d ?? 0)}
          icon="💰"
          color="#22c55e"
        />
        <StatCard
          label="New Contacts"
          value={String(context?.newContacts30d ?? 0)}
          icon="👥"
          color="#6366f1"
        />
        <StatCard
          label="Pipeline"
          value={formatCurrency(context?.pipelineValue ?? 0)}
          icon="📊"
          color="#3b82f6"
        />
        <StatCard
          label="Active Deals"
          value={String(context?.activeDeals ?? 0)}
          icon="🤝"
          color="#f59e0b"
        />
        <StatCard
          label="Today's Appts"
          value={String(context?.appointmentsToday ?? 0)}
          icon="📅"
          color="#ec4899"
        />
        <StatCard
          label="Avg Rating"
          value={`${context?.avgRating ?? 0}⭐`}
          icon="🌟"
          color="#eab308"
        />
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        {[
          { label: 'Add Contact', icon: '👤', screen: 'Contacts' },
          { label: 'New Invoice', icon: '🧾', screen: 'Invoices' },
          { label: 'Book Appt', icon: '📅', screen: 'Appointments' },
          { label: 'AI Brain', icon: '🧠', screen: 'Brain' },
        ].map(action => (
          <TouchableOpacity key={action.label} style={styles.quickAction}>
            <Text style={styles.quickActionIcon}>{action.icon}</Text>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 2 },
  orgName: { fontSize: 13, color: '#94a3b8' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  logoutText: { color: '#94a3b8', fontSize: 12 },
  alertsSection: { marginBottom: 20, gap: 8 },
  alert: { borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center' },
  alertWarning: { backgroundColor: '#451a03', borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  alertInfo: { backgroundColor: '#0c2a4a', borderLeftWidth: 3, borderLeftColor: '#3b82f6' },
  alertText: { color: '#e2e8f0', fontSize: 13, flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#94a3b8', marginBottom: 12, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    width: '47%',
    borderLeftWidth: 3,
    gap: 4,
  },
  statIcon: { fontSize: 22, marginBottom: 2 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#f8fafc' },
  statLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickActionIcon: { fontSize: 28 },
  quickActionLabel: { fontSize: 12, fontWeight: '600', color: '#e2e8f0', textAlign: 'center' },
})
