import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  status?: string
  tags?: string[]
}

const DEMO_CONTACTS: Contact[] = [
  { id: '1', firstName: 'Alice', lastName: 'Johnson', email: 'alice@example.com', phone: '(555) 111-2222', status: 'LEAD', tags: ['hot-lead'] },
  { id: '2', firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com', phone: '(555) 333-4444', status: 'CUSTOMER', tags: ['vip'] },
  { id: '3', firstName: 'Carol', lastName: 'Davis', email: 'carol@example.com', phone: '(555) 555-6666', status: 'PROSPECT' },
  { id: '4', firstName: 'David', lastName: 'Lee', email: 'david@example.com', status: 'CUSTOMER' },
  { id: '5', firstName: 'Emma', lastName: 'Wilson', email: 'emma@example.com', phone: '(555) 777-8888', status: 'LEAD' },
]

const STATUS_COLORS: Record<string, string> = {
  LEAD: '#f59e0b',
  PROSPECT: '#3b82f6',
  CUSTOMER: '#10b981',
  CHURNED: '#ef4444',
}

export default function CRMScreen() {
  const [contacts, setContacts] = useState<Contact[]>(DEMO_CONTACTS)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    return !q || `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(q)
  })

  const initials = (c: Contact) => `${c.firstName[0]}${c.lastName[0]}`.toUpperCase()
  const statusColor = (s?: string) => STATUS_COLORS[s ?? ''] ?? '#6b7280'

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.countBar}>
        <Text style={styles.countText}>{filtered.length} contacts</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card}>
              <View style={[styles.avatar, { backgroundColor: statusColor(item.status) + '30' }]}>
                <Text style={[styles.avatarText, { color: statusColor(item.status) }]}>{initials(item)}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardRow}>
                  <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                  {item.status && (
                    <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.email}>{item.email}</Text>
                {item.phone && <Text style={styles.phone}>{item.phone}</Text>}
                {item.tags && item.tags.length > 0 && (
                  <View style={styles.tags}>
                    {item.tags.map(t => (
                      <View key={t} style={styles.tag}>
                        <Text style={styles.tagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No contacts found</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', margin: 16, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 15 },
  clearBtn: { color: '#64748b', fontSize: 16, paddingHorizontal: 4 },
  countBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 4 },
  countText: { color: '#64748b', fontSize: 13 },
  addBtn: { backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700' },
  cardContent: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name: { color: '#f8fafc', fontSize: 15, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  email: { color: '#94a3b8', fontSize: 12, marginTop: 1 },
  phone: { color: '#64748b', fontSize: 12, marginTop: 1 },
  tags: { flexDirection: 'row', marginTop: 6, gap: 4 },
  tag: { backgroundColor: '#0f172a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { color: '#94a3b8', fontSize: 10 },
  chevron: { color: '#475569', fontSize: 20, marginLeft: 8 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 16 },
})
