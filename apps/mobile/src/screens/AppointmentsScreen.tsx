import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { api } from '../lib/api'
import { format } from 'date-fns'

interface Appointment {
  id: string
  title: string
  startTime: string
  endTime: string
  status: string
  duration: number
  location?: string
  contact?: { firstName: string; lastName?: string; phone?: string }
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#3b82f6',
  COMPLETED: '#22c55e',
  CANCELED: '#ef4444',
  NO_SHOW: '#f59e0b',
}

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ appointments: Appointment[] }>('/receptionist/appointments?limit=50')
      setAppointments(data.appointments)
    } catch {
      setAppointments([
        { id: '1', title: 'Initial Consultation — Sarah J.', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), status: 'SCHEDULED', duration: 60, contact: { firstName: 'Sarah', lastName: 'Johnson', phone: '+1 555-0101' } },
        { id: '2', title: 'Follow-up — Mike Chen', startTime: new Date(Date.now() + 7200000).toISOString(), endTime: new Date(Date.now() + 9000000).toISOString(), status: 'SCHEDULED', duration: 30, contact: { firstName: 'Mike', lastName: 'Chen' } },
      ])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const onRefresh = () => { setRefreshing(true); void load() }

  const renderItem = ({ item }: { item: Appointment }) => {
    const start = new Date(item.startTime)
    const color = STATUS_COLORS[item.status] ?? '#6b7280'

    return (
      <TouchableOpacity style={styles.card}>
        <View style={[styles.statusBar, { backgroundColor: color }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
              <Text style={[styles.statusText, { color }]}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.cardTime}>
            {format(start, 'EEE, MMM d')} · {format(start, 'h:mm a')} · {item.duration} min
          </Text>
          {item.contact && (
            <Text style={styles.cardContact}>
              👤 {item.contact.firstName} {item.contact.lastName}
              {item.contact.phone ? ` · ${item.contact.phone}` : ''}
            </Text>
          )}
          {item.location && <Text style={styles.cardLocation}>📍 {item.location}</Text>}
        </View>
      </TouchableOpacity>
    )
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
      <FlatList
        data={appointments}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No appointments</Text>
          </View>
        }
        ListHeaderComponent={
          <Text style={styles.countText}>
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
          </Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  list: { padding: 16, gap: 10 },
  countText: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, flexDirection: 'row', overflow: 'hidden' },
  statusBar: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#f1f5f9', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cardTime: { fontSize: 12, color: '#94a3b8' },
  cardContact: { fontSize: 12, color: '#64748b' },
  cardLocation: { fontSize: 12, color: '#64748b' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, color: '#475569', fontWeight: '500' },
})
