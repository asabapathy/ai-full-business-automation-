import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useState } from 'react'

interface Invoice {
  id: string
  number: string
  clientName: string
  amount: number
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'
  dueDate: string
  issuedDate: string
}

const DEMO_INVOICES: Invoice[] = [
  { id: '1', number: 'INV-0042', clientName: 'Alice Johnson', amount: 1250.00, status: 'PAID', dueDate: '2024-12-01', issuedDate: '2024-11-15' },
  { id: '2', number: 'INV-0043', clientName: 'Bob Smith', amount: 3400.00, status: 'SENT', dueDate: '2025-01-15', issuedDate: '2024-12-20' },
  { id: '3', number: 'INV-0044', clientName: 'Carol Davis', amount: 750.00, status: 'OVERDUE', dueDate: '2024-12-15', issuedDate: '2024-12-01' },
  { id: '4', number: 'INV-0045', clientName: 'David Lee', amount: 2100.00, status: 'DRAFT', dueDate: '2025-02-01', issuedDate: '2025-01-10' },
  { id: '5', number: 'INV-0046', clientName: 'Emma Wilson', amount: 5800.00, status: 'PAID', dueDate: '2024-12-28', issuedDate: '2024-12-01' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: '#64748b', bg: '#1e293b' },
  SENT: { label: 'Sent', color: '#3b82f6', bg: '#1e3a5f' },
  PAID: { label: 'Paid', color: '#10b981', bg: '#052e16' },
  OVERDUE: { label: 'Overdue', color: '#ef4444', bg: '#450a0a' },
}

type FilterStatus = 'ALL' | 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'

export default function InvoicesScreen() {
  const [filter, setFilter] = useState<FilterStatus>('ALL')

  const filtered = filter === 'ALL' ? DEMO_INVOICES : DEMO_INVOICES.filter(i => i.status === filter)

  const totals = {
    outstanding: DEMO_INVOICES.filter(i => i.status === 'SENT' || i.status === 'OVERDUE').reduce((s, i) => s + i.amount, 0),
    overdue: DEMO_INVOICES.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + i.amount, 0),
    paid: DEMO_INVOICES.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0),
  }

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{fmt(totals.outstanding)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Overdue</Text>
          <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{fmt(totals.overdue)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Collected</Text>
          <Text style={[styles.summaryValue, { color: '#10b981' }]}>{fmt(totals.paid)}</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(['ALL', 'SENT', 'OVERDUE', 'PAID', 'DRAFT'] as FilterStatus[]).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'ALL' ? 'All' : STATUS_CONFIG[f].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status]
          return (
            <TouchableOpacity style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                <View>
                  <Text style={styles.invoiceNumber}>{item.number}</Text>
                  <Text style={styles.clientName}>{item.clientName}</Text>
                  <Text style={styles.date}>Due {new Date(item.dueDate).toLocaleDateString()}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.amount}>{fmt(item.amount)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyText}>No invoices found</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabText}>+ New Invoice</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  summaryRow: { flexDirection: 'row', padding: 16, gap: 8 },
  summaryCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryLabel: { color: '#64748b', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 6 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1e293b' },
  filterBtnActive: { backgroundColor: '#6366f1' },
  filterText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  invoiceNumber: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
  clientName: { color: '#94a3b8', fontSize: 12, marginTop: 1 },
  date: { color: '#64748b', fontSize: 11, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  amount: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 16 },
  fab: { margin: 16, backgroundColor: '#6366f1', borderRadius: 14, padding: 16, alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
