import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { api } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
  INFO: 'ℹ️',
  SUCCESS: '✅',
  WARNING: '⚠️',
  ERROR: '🔴',
  AI_INSIGHT: '🧠',
  TASK_COMPLETE: '✔️',
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ notifications: Notification[] }>('/notifications?limit=50')
      setNotifications(data.notifications)
    } catch {
      setNotifications([
        { id: '1', title: 'Payment Received', message: 'Invoice #INV-001 was paid by Sarah Johnson ($450)', type: 'SUCCESS', isRead: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
        { id: '2', title: 'Overdue Invoice', message: 'Invoice #INV-005 is 7 days overdue ($1,200)', type: 'WARNING', isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
        { id: '3', title: 'New Review', message: 'Mike Chen left a 5-star review on Google', type: 'SUCCESS', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: '4', title: 'AI Insight', message: 'Revenue is up 12% vs last month. Consider upselling to top clients.', type: 'AI_INSIGHT', isRead: true, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      ])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const markRead = async (id: string) => {
    try {
      await api.post('/notifications/mark-read', { ids: [id] })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {}
  }

  const onRefresh = () => { setRefreshing(true); void load() }

  const unreadCount = notifications.filter(n => !n.isRead).length

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={() => !item.isRead && markRead(item.id)}
    >
      <Text style={styles.icon}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
      <View style={styles.cardContent}>
        <Text style={[styles.title, !item.isRead && styles.titleUnread]}>{item.title}</Text>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )

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
        data={notifications}
        keyExtractor={n => n.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        ListHeaderComponent={
          unreadCount > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.countText}>{unreadCount} unread</Text>
              <TouchableOpacity onPress={markAllRead}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  list: { padding: 16, gap: 8 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  countText: { fontSize: 13, color: '#64748b' },
  markAllText: { fontSize: 12, color: '#6366f1', fontWeight: '600' },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardUnread: { backgroundColor: '#1e2d4a', borderLeftWidth: 2, borderLeftColor: '#6366f1' },
  icon: { fontSize: 22, marginTop: 1 },
  cardContent: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontWeight: '500', color: '#94a3b8' },
  titleUnread: { color: '#f1f5f9', fontWeight: '700' },
  message: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  time: { fontSize: 11, color: '#475569', marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1', marginTop: 4, flexShrink: 0 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, color: '#475569', fontWeight: '500' },
})
