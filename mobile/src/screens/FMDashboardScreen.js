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
  borderLight: '#F1F5F9',
  error: '#EF4444',
  errorLight: '#FEF2F2',
};

const STATUSES = ['all', 'pending', 'assigned', 'in_progress', 'resolved', 'closed'];
const CATEGORIES = ['all', 'electrical', 'plumbing', 'cleaning', 'furniture', 'other'];

const STATUS_LABEL = {
  all: 'All', pending: 'Pending', assigned: 'Assigned',
  in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
};

const STATUS_CHIP = {
  all:         { color: '#4F46E5', bg: '#EEF2FF' },
  pending:     { color: '#F59E0B', bg: '#FEF3C7' },
  assigned:    { color: '#8B5CF6', bg: '#EDE9FE' },
  in_progress: { color: '#4F46E5', bg: '#EEF2FF' },
  resolved:    { color: '#10B981', bg: '#D1FAE5' },
  closed:      { color: '#6B7280', bg: '#F3F4F6' },
};

const CATEGORY_ICONS = {
  all: '📋', electrical: '⚡', plumbing: '🔧', cleaning: '🧹', furniture: '🪑', other: '📌',
};

const STAT_ITEMS = [
  { key: 'total',    label: 'Total',    icon: '🗂',  color: '#4F46E5' },
  { key: 'pending',  label: 'Pending',  icon: '⏳',  color: '#F59E0B' },
  { key: 'active',   label: 'Active',   icon: '⚙️', color: '#8B5CF6' },
  { key: 'resolved', label: 'Resolved', icon: '✅',  color: '#10B981' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function FMDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  async function load() {
    try {
      setError(null);
      const data = await apiGet('/issues');
      setIssues(data.issues);
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

  const stats = useMemo(() => ({
    total: issues.length,
    pending: issues.filter((i) => i.status === 'pending').length,
    active: issues.filter((i) => i.status === 'in_progress' || i.status === 'assigned').length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
  }), [issues]);

  const filtered = useMemo(() => issues.filter((issue) => {
    const matchStatus = statusFilter === 'all' || issue.status === statusFilter;
    const matchCat = categoryFilter === 'all' || issue.category === categoryFilter;
    return matchStatus && matchCat;
  }), [issues, statusFilter, categoryFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: issues.length };
    STATUSES.slice(1).forEach((s) => { counts[s] = issues.filter((i) => i.status === s).length; });
    return counts;
  }, [issues]);

  const firstName = user?.full_name?.split(' ')[0] ?? 'Manager';
  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'FM';
  const isFiltered = statusFilter !== 'all' || categoryFilter !== 'all';
  const greeting = getGreeting();

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        {/* Keep hero visible while loading */}
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
              <Text style={styles.rolePillText}>Facility Manager</Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading issues…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── HERO HEADER ─── */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.heroTopRow}>
          {/* Initials avatar */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          {/* Greeting text */}
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroGreetLine}>{greeting},</Text>
            <Text style={styles.heroName}>{firstName}</Text>
          </View>

          {/* Sign out */}
          <Pressable onPress={logout} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        {/* Role + date row */}
        <View style={styles.heroBottomRow}>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>Facility Manager</Text>
          </View>
          <Text style={styles.heroDate}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* ─── SCROLLABLE CONTENT ─── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <IssueCard
            issue={item}
            showSubmitter
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
              {STAT_ITEMS.map(({ key, label, icon, color }) => (
                <StatCard key={key} icon={icon} label={label} value={stats[key]} color={color} />
              ))}
            </View>

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
            <View style={styles.filterCard}>
              {/* Status filter */}
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Status</Text>
                {isFiltered && (
                  <Pressable onPress={() => { setStatusFilter('all'); setCategoryFilter('all'); }}>
                    <Text style={styles.clearText}>Clear all</Text>
                  </Pressable>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {STATUSES.map((s) => {
                  const active = statusFilter === s;
                  const cfg = STATUS_CHIP[s];
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setStatusFilter(s)}
                      style={[
                        styles.chip,
                        active && { backgroundColor: cfg.color, borderColor: cfg.color },
                      ]}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {STATUS_LABEL[s]}
                      </Text>
                      <View style={[styles.chipCount, active && styles.chipCountActive]}>
                        <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>
                          {statusCounts[s] ?? 0}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Category filter */}
              <Text style={[styles.filterTitle, { marginTop: 10 }]}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {CATEGORIES.map((c) => {
                  const active = categoryFilter === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCategoryFilter(c)}
                      style={[styles.chip, active && styles.chipCatActive]}
                    >
                      <Text style={styles.chipIcon}>{CATEGORY_ICONS[c]}</Text>
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Results label */}
            <View style={styles.resultsRow}>
              <Text style={styles.resultsText}>
                <Text style={styles.resultsCount}>{filtered.length}</Text>
                {' '}{filtered.length === 1 ? 'issue' : 'issues'}
                {isFiltered ? ' found' : ' total'}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>🔍</Text>
            </View>
            <Text style={styles.emptyTitle}>No issues found</Text>
            <Text style={styles.emptyBody}>
              {isFiltered ? 'No issues match your current filters.' : 'All campus issues will appear here.'}
            </Text>
            {isFiltered && (
              <Pressable
                style={styles.emptyBtn}
                onPress={() => { setStatusFilter('all'); setCategoryFilter('all'); }}
              >
                <Text style={styles.emptyBtnText}>Clear Filters</Text>
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroTextBlock: { flex: 1 },
  heroGreetLine: { fontSize: 12, color: 'rgba(255,255,255,0.68)', fontWeight: '500', marginBottom: 2 },
  heroName: { fontSize: 22, color: '#fff', fontWeight: '800', letterSpacing: -0.3 },
  skeletonName: { width: 140, height: 22, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)' },

  signOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  signOutText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' },

  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
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
    fontSize: 10,
    color: P.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── FILTERS ── */
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
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: P.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  clearText: { fontSize: 12, color: P.primary, fontWeight: '700' },

  chipRow: { gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: P.border,
    backgroundColor: P.bg,
  },
  chipCatActive: { backgroundColor: P.primary, borderColor: P.primary },
  chipIcon: { fontSize: 12 },
  chipLabel: { fontSize: 12, color: P.textSub, fontWeight: '700' },
  chipLabelActive: { color: '#fff' },
  chipCount: {
    backgroundColor: P.border,
    borderRadius: 10,
    minWidth: 20,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipCountText: { fontSize: 10, fontWeight: '800', color: P.textSub },
  chipCountTextActive: { color: '#fff' },

  /* ── RESULTS ── */
  resultsRow: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: 6,
  },
  resultsText: { fontSize: 13, color: P.textMuted, fontWeight: '500' },
  resultsCount: { fontWeight: '800', color: P.text },

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
  errorMsg: { color: P.error, flex: 1, fontSize: 13, fontWeight: '500' },
  retryBtn: {
    backgroundColor: P.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  /* ── LIST ── */
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },

  /* ── EMPTY ── */
  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: P.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyIcon: { fontSize: 34 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: P.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    color: P.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  emptyBtn: {
    backgroundColor: P.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
