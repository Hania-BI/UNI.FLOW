import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiGet, apiPut } from '../api/client';
import { SPACING } from '../theme';

// Design tokens — unified with auth screen palette
const P = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primaryLight: '#EEF2FF',
  bg: '#F8F9FF',
  surface: '#FFFFFF',
  text: '#0F172A',
  textSub: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  success: '#10B981',
};

// Avatars use purple-adjacent hues
const AVATAR_COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#10B981', '#F59E0B', '#6366F1'];

function getAvatarColor(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const FILTER_TABS = (stats) => [
  { key: 'all',      label: 'All',      count: stats.total,    activeColor: P.primary },
  { key: 'active',   label: 'Active',   count: stats.active,   activeColor: P.success },
  { key: 'inactive', label: 'Inactive', count: stats.inactive, activeColor: '#6B7280' },
];

export default function WorkersScreen() {
  const insets = useSafeAreaInsets();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [filter, setFilter] = useState('all');

  async function load() {
    try {
      setError(null);
      const data = await apiGet('/manager/workers');
      setWorkers(data.workers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  async function toggleStatus(worker) {
    const newStatus = worker.status === 'active' ? 'inactive' : 'active';
    Alert.alert(
      `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Worker`,
      `Set ${worker.full_name} as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'inactive' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setTogglingId(worker.id);
              const data = await apiPut(`/manager/workers/${worker.id}/status`, { status: newStatus });
              setWorkers((prev) => prev.map((w) => (w.id === worker.id ? data.worker : w)));
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setTogglingId(null);
            }
          },
        },
      ]
    );
  }

  const stats = useMemo(() => ({
    total: workers.length,
    active: workers.filter((w) => w.status === 'active').length,
    inactive: workers.filter((w) => w.status === 'inactive').length,
  }), [workers]);

  const filtered = useMemo(() => {
    if (filter === 'all') return workers;
    return workers.filter((w) => w.status === filter);
  }, [workers, filter]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={P.primary} />
        <Text style={styles.loadingText}>Loading workers…</Text>
      </View>
    );
  }

  const tabs = FILTER_TABS(stats);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Team Overview</Text>
          <Text style={styles.headerTitle}>Workers</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{stats.total} registered</Text>
        </View>
      </View>

      {/* ─── STATS ─── */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total',    value: stats.total,    color: P.primary,  icon: '👥' },
          { label: 'Active',   value: stats.active,   color: P.success,  icon: '✅' },
          { label: 'Inactive', value: stats.inactive, color: '#6B7280',  icon: '⏸' },
        ].map(({ label, value, color, icon }) => (
          <View key={label} style={[styles.statCard, { borderTopColor: color }]}>
            <Text style={styles.statCardIcon}>{icon}</Text>
            <Text style={[styles.statCardValue, { color }]}>{value}</Text>
            <Text style={styles.statCardLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ─── FILTER TABS ─── */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={[
                styles.tab,
                active && { backgroundColor: tab.activeColor, borderColor: tab.activeColor },
              ]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ─── ERROR ─── */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* ─── LIST ─── */}
      <FlatList
        data={filtered}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>👷</Text>
            </View>
            <Text style={styles.emptyTitle}>No workers found</Text>
            <Text style={styles.emptySubtitle}>
              {filter !== 'all'
                ? 'No workers match this filter.'
                : 'Workers who register will appear here.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const avatarColor = getAvatarColor(item.id);
          const isActive = item.status === 'active';
          const joinDate = new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          });
          return (
            <View style={[styles.card, !isActive && styles.cardInactive]}>
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: isActive ? avatarColor : '#CBD5E1' }]}>
                <Text style={styles.avatarText}>
                  {item.full_name?.charAt(0).toUpperCase() ?? '?'}
                </Text>
              </View>

              {/* Info */}
              <View style={styles.cardBody}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
                  <View style={[
                    styles.statusPill,
                    { backgroundColor: isActive ? '#D1FAE5' : '#F3F4F6' },
                  ]}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: isActive ? P.success : '#9CA3AF' },
                    ]} />
                    <Text style={[
                      styles.statusPillText,
                      { color: isActive ? '#065F46' : '#6B7280' },
                    ]}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
                <Text style={styles.joinDate}>Joined {joinDate}</Text>
              </View>

              {/* Toggle */}
              <View style={styles.toggleWrap}>
                {togglingId === item.id ? (
                  <ActivityIndicator size="small" color={P.primary} />
                ) : (
                  <Switch
                    value={isActive}
                    onValueChange={() => toggleStatus(item)}
                    trackColor={{ false: '#E2E8F0', true: P.primaryLight }}
                    thumbColor={isActive ? P.primary : '#94A3B8'}
                    ios_backgroundColor="#E2E8F0"
                  />
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: P.bg, gap: 12 },
  loadingText: { fontSize: 14, color: P.textMuted, fontWeight: '500' },

  /* ── HEADER ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: P.surface,
    borderBottomWidth: 1,
    borderBottomColor: P.border,
    elevation: 2,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headerEyebrow: { fontSize: 11, color: P.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: P.text, letterSpacing: -0.4 },
  headerBadge: {
    backgroundColor: P.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  headerBadgeText: { fontSize: 12, color: P.primary, fontWeight: '700' },

  /* ── STATS ── */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: P.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: P.border,
    elevation: 2,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  statCardIcon: { fontSize: 18, marginBottom: 5 },
  statCardValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statCardLabel: {
    fontSize: 10,
    color: P.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── TABS ── */
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: P.border,
    backgroundColor: P.surface,
  },
  tabText: { fontSize: 12, fontWeight: '700', color: P.textSub },
  tabTextActive: { color: '#fff' },
  tabBadge: {
    backgroundColor: P.border,
    borderRadius: 10,
    minWidth: 20,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: P.textSub },
  tabBadgeTextActive: { color: '#fff' },

  /* ── ERROR ── */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.errorLight,
    borderRadius: 12,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorIcon: { fontSize: 15 },
  errorText: { color: P.error, flex: 1, fontSize: 13, fontWeight: '500' },
  retryBtn: { backgroundColor: P.error, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  /* ── LIST ── */
  listContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 100 },

  /* ── EMPTY ── */
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: P.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: P.text, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { color: P.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 20 },

  /* ── CARD ── */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surface,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: P.border,
    gap: SPACING.md,
    elevation: 2,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardInactive: { opacity: 0.6 },

  avatar: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 20 },

  cardBody: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '700', color: P.text, flex: 1 },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  email: { fontSize: 12, color: P.textSub, marginBottom: 4, fontWeight: '500' },
  joinDate: { fontSize: 11, color: P.textMuted, fontWeight: '500' },

  toggleWrap: { alignItems: 'center', flexShrink: 0 },
});
