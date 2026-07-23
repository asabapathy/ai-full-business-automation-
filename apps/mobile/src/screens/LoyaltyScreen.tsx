import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

interface LoyaltyData {
  points: number
  tier: string
  nextTierPoints: number
  recentTransactions: Array<{ id: string; points: number; description: string; createdAt: string }>
  rewards: Array<{ id: string; name: string; pointsCost: number; available: boolean }>
}

const TIER_CONFIG: Record<string, { color: string; icon: string }> = {
  Bronze: { color: '#cd7f32', icon: '🥉' },
  Silver: { color: '#c0c0c0', icon: '🥈' },
  Gold: { color: '#ffd700', icon: '🥇' },
  Platinum: { color: '#e5e4e2', icon: '💎' },
}

export default function LoyaltyScreen() {
  const { user, organization } = useAuthStore()
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLoyalty()
  }, [])

  async function loadLoyalty() {
    try {
      const data = await api.get<LoyaltyData>('/portal/loyalty')
      setLoyalty(data)
    } catch {
      setLoyalty({
        points: 0,
        tier: 'Bronze',
        nextTierPoints: 500,
        recentTransactions: [],
        rewards: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const tierInfo = TIER_CONFIG[loyalty?.tier ?? 'Bronze'] ?? TIER_CONFIG['Bronze']!
  const progress = loyalty ? Math.min((loyalty.points / loyalty.nextTierPoints) * 100, 100) : 0

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile header */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.profileOrg}>{organization?.name}</Text>
        </View>
      </View>

      {/* Points card */}
      <View style={[styles.pointsCard, { borderColor: tierInfo.color }]}>
        <View style={styles.pointsHeader}>
          <Text style={styles.tierIcon}>{tierInfo.icon}</Text>
          <View>
            <Text style={[styles.tierName, { color: tierInfo.color }]}>{loyalty?.tier} Member</Text>
            <Text style={styles.pointsValue}>{(loyalty?.points ?? 0).toLocaleString()} pts</Text>
          </View>
        </View>

        {/* Progress to next tier */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress to next tier</Text>
            <Text style={styles.progressPoints}>{loyalty?.nextTierPoints ?? 0} pts needed</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: tierInfo.color }]} />
          </View>
        </View>
      </View>

      {/* Rewards */}
      {(loyalty?.rewards?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>
          {loyalty!.rewards.map(reward => (
            <View key={reward.id} style={[styles.rewardCard, !reward.available && styles.rewardCardDisabled]}>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardName}>{reward.name}</Text>
                <Text style={styles.rewardCost}>{reward.pointsCost} pts</Text>
              </View>
              <TouchableOpacity
                style={[styles.redeemBtn, !reward.available && styles.redeemBtnDisabled]}
                disabled={!reward.available}
              >
                <Text style={[styles.redeemBtnText, !reward.available && styles.redeemBtnTextDisabled]}>
                  {reward.available ? 'Redeem' : 'Need more pts'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Transaction history */}
      {(loyalty?.recentTransactions?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Points Activity</Text>
          {loyalty!.recentTransactions.map(txn => (
            <View key={txn.id} style={styles.txnRow}>
              <View style={styles.txnInfo}>
                <Text style={styles.txnDesc}>{txn.description}</Text>
                <Text style={styles.txnDate}>{new Date(txn.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txnPoints, { color: txn.points >= 0 ? '#22c55e' : '#ef4444' }]}>
                {txn.points >= 0 ? '+' : ''}{txn.points}
              </Text>
            </View>
          ))}
        </View>
      )}

      {loyalty?.recentTransactions?.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyText}>No points activity yet</Text>
          <Text style={styles.emptySubtext}>Book appointments to earn loyalty points</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, gap: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  profileOrg: { fontSize: 12, color: '#64748b', marginTop: 2 },
  pointsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    gap: 16,
  },
  pointsHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tierIcon: { fontSize: 40 },
  tierName: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  pointsValue: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginTop: 2 },
  progressSection: { gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, color: '#64748b' },
  progressPoints: { fontSize: 12, color: '#94a3b8' },
  progressBar: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  rewardCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rewardCardDisabled: { opacity: 0.6 },
  rewardInfo: { flex: 1 },
  rewardName: { fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  rewardCost: { fontSize: 12, color: '#64748b', marginTop: 2 },
  redeemBtn: { backgroundColor: '#4f46e5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  redeemBtnDisabled: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  redeemBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  redeemBtnTextDisabled: { color: '#475569' },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 13, color: '#e2e8f0' },
  txnDate: { fontSize: 11, color: '#64748b', marginTop: 2 },
  txnPoints: { fontSize: 16, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 6 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#475569', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#334155', textAlign: 'center' },
})
