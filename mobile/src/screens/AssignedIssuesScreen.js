import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiGet } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import IssueCard from '../components/IssueCard';
import { SPACING } from '../theme';

const P = {
  primary: '#4F46E5',
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

const FILTERS = [
  { key: 'all',         label: 'All',         activeColor: '#4F46E5' },
  { key: 'assigned',    label: 'To Do',        activeColor: '#8B5CF6' },
  { key: 'in_progress', label: 'In Progress',  activeColor: '#4F46E5' },
  { key: 'resolved',    label: 'Resolved',     activeColor: '#10B981' },
];

const STAT_META = [
  { key: 'all',         label: 'Total',  icon: '🗂',  color: '#4F46E5' },
  { key: 'assigned',    label: 'To Do',  icon: '⏳',  color: '#8B5CF6' },
  { key: 'in_progress', label: 'Active', icon: '⚙️', color: '#4F46E5' },
  { key: 'resolved',    label: 'Done',   icon: '✅',  color: '#10B981' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function AssignedIssuesScreen({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  async function load() {
    try {
      setError(null);
      const data = await apiGet('/issues/assigned');
      setIssues(data.issues);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));
  function onRefresh() { setRefreshing(true); load(); }

  const filtered = useMemo(
    () => filter === 'all' ? issues : issues.filter((i) => i.status === filter),
    [issues, filter]
  );

  const counts = useMemo(() => ({
    all: issues.length,
    assigned: issues.filter((i) => i.status === 'assigned').length,
    in_progress: issues.filter((i) => i.status === 'in_progress').length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
  }), [issues]);

  const firstName = user?.full_name?.split(' ')[0] ?? 'Worker';
  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'W';
  const urgentCount = counts.assigned;
  const greeting = getGreeting();
  const isFiltered = filter !== 'all';

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroGreetLine}>{greeting},</Text>
              <View style={styles.skeletonName} />
            </View>
          </View>
          <View style={styles.heroBottomRow}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>Worker</Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading tasks…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── HERO HEADER ─── */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.heroTopRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroGreetLine}>{greeting},</Text>
            <Text style={styles.heroName}>{firstName}</Text>
          </View>
          <Pressable onPress={logout} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
        <View style={styles.heroBottomRow}>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>Worker</Text>
          </View>
          <Text style={styles.heroDate}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short', month: 'long', day: 'numeric',
            })}
          </Text>
        </View>
      </View>

      {/* ─── LIST ─── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <IssueCard
            issue={item}
            onPress={() => navigation.navigate('IssueDetail', { id: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.primary} />
        }
        ListHeaderComponent={
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              {STAT_META.map(({ key, label, icon, color }) => (
                <StatCard key={key} icon={icon} label={label} value={counts[key]} color={color} />
              ))}
            </View>

            {/* Urgency banner */}
            {urgentCount > 0 && (
              <View style={styles.urgencyBanner}>
                <Text style={styles.urgencyIcon}>🔔</Text>
                <View style={styles.urgencyBody}>
                  <Text style={styles.urgencyTitle}>
                    {urgentCount} {urgentCount === 1 ? 'task' : 'tasks'} ready to start
                  </Text>
                  <Text style={styles.urgencySubtitle}>Tap a task below to begin</Text>
                </View>
                <View style={styles.urgencyBadge}>
                  <Text style={styles.urgencyBadgeText}>{urgentCount}</Text>
                </View>
              </View>
            )}

            {/* Error */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorMsg}>{error}</Text>
                <Pressable onPress={load} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {/* Filter card */}
            {issues.length > 0 && (
              <View style={styles.filterCard}>
                <View style={styles.filterCardHeader}>
                  <Text style={styles.filterCardTitle}>Filter by Status</Text>
                  {isFiltered && (
                    <Pressable onPress={() => setFilter('all')}>
                      <Text style={styles.clearText}>Clear</Text>
                    </Pressable>
                  )}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {FILTERS.map((f) => {
                    const active = filter === f.key;
                    return (
                      <Pressable
                        key={f.key}
                        onPress={() => setFilter(f.key)}
                        style={[
                          styles.chip,
                          active && { backgroundColor: f.activeColor, borderColor: f.activeColor },
                        ]}
                      >
                        <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                          {f.label}
                        </Text>
                        <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
                          <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>
                            {counts[f.key]}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Results label */}
            {issues.length > 0 && (
              <View style={styles.resultsRow}>
                <Text style={styles.resultsText}>
                  <Text style={styles.resultsCount}>{filtered.length}</Text>
                  {' '}{filtered.length === 1 ? 'task' : 'tasks'}
                  {isFiltered ? ' matching' : ' assigned to you'}
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>{isFiltered ? '🔍' : '🎉'}</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {isFiltered ? 'No tasks found' : 'All clear!'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isFiltered
                ? 'No tasks match this filter.'
                : issues.length === 0
                  ? 'No tasks have been assigned to you yet.'
                  : "You're all caught up."}
            </Text>
            {isFiltered && (
              <Pressable style={styles.emptyBtn} onPress={() => setFilter('all')}>
                <Text style={styles.emptyBtnText}>Show All Tasks</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  loadingRoot: { flex: 1, backgroundColor: P.primary },
  loadingBody: {
    flex: 1,
    backgroundColor: P.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: P.textMuted, fontWeight: '500' },

  /* ── HERO ── */
  hero: {
    backgroundColor: P.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroTextBlock: { flex: 1 },
  heroGreetLine: { fontSize: 12, color: 'rgba(255,255,255,0.68)', fontWeight: '500', marginBottom: 2 },
  heroName: { fontSize: 22, color: '#fff', fontWeight: '800', letterSpacing: -0.3 },
  skeletonName: { width: 140, height: 22, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)' },

  signOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  signOutText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' },

  heroBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  rolePillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  heroDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },

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
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statIcon: { fontSize: 18, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: {
    fontSize: 10, color: P.textMuted,
    fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
  },

  /* ── URGENCY BANNER ── */
  urgencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 12,
  },
  urgencyIcon: { fontSize: 20 },
  urgencyBody: { flex: 1 },
  urgencyTitle: { fontSize: 14, fontWeight: '700', color: P.primary, marginBottom: 2 },
  urgencySubtitle: { fontSize: 12, color: '#6366F1', fontWeight: '500' },
  urgencyBadge: {
    backgroundColor: P.primary,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  urgencyBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  /* ── FILTER CARD ── */
  filterCard: {
    backgroundColor: P.surface,
    marginHorizontal: SPACING.lg,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: P.border,
    elevation: 1,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    gap: SPACING.sm,
  },
  filterCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterCardTitle: {
    fontSize: 11, fontWeight: '800', color: P.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  clearText: { fontSize: 12, color: P.primary, fontWeight: '700' },
  chipRow: { gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: P.border, backgroundColor: P.bg,
  },
  chipLabel: { fontSize: 12, color: P.textSub, fontWeight: '700' },
  chipLabelActive: { color: '#fff' },
  chipBadge: {
    backgroundColor: P.border, borderRadius: 10,
    minWidth: 20, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  chipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipBadgeText: { fontSize: 10, fontWeight: '800', color: P.textSub },
  chipBadgeTextActive: { color: '#fff' },

  /* ── RESULTS ── */
  resultsRow: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 6 },
  resultsText: { fontSize: 13, color: P.textMuted, fontWeight: '500' },
  resultsCount: { fontWeight: '800', color: P.text },

  /* ── ERROR ── */
  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: P.errorLight, borderRadius: 12,
    padding: SPACING.md, marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm, gap: SPACING.sm,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorIcon: { fontSize: 15 },
  errorMsg: { color: P.error, flex: 1, fontSize: 13, fontWeight: '500' },
  retryBtn: { backgroundColor: P.error, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  /* ── LIST ── */
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },

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
  emptySubtitle: { color: P.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: SPACING.lg },
  emptyBtn: { backgroundColor: P.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
