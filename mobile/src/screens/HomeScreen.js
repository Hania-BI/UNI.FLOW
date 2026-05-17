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
  primary:      '#4F46E5',
  primaryDark:  '#3730A3',
  primaryLight: '#EEF2FF',
  bg:           '#F8F9FF',
  surface:      '#FFFFFF',
  text:         '#0F172A',
  textSub:      '#475569',
  textMuted:    '#94A3B8',
  border:       '#E2E8F0',
  error:        '#EF4444',
  errorLight:   '#FEF2F2',
  success:      '#10B981',
  warning:      '#F59E0B',
};

const STATUS_FILTERS = ['all', 'pending', 'assigned', 'in_progress', 'resolved', 'closed'];
const STATUS_LABELS  = {
  all: 'All', pending: 'Pending', assigned: 'Assigned',
  in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
};
const FILTER_COLORS = {
  all:         '#4F46E5',
  pending:     '#F59E0B',
  assigned:    '#8B5CF6',
  in_progress: '#4F46E5',
  resolved:    '#10B981',
  closed:      '#6B7280',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(fullName = '') {
  return fullName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
}

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [issues,    setIssues]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,     setError]     = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  async function load() {
    try {
      setError(null);
      const data = await apiGet('/issues/my');
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

  const filtered = useMemo(
    () => statusFilter === 'all' ? issues : issues.filter((i) => i.status === statusFilter),
    [issues, statusFilter]
  );

  const counts = useMemo(() => {
    const c = { all: issues.length };
    STATUS_FILTERS.slice(1).forEach((s) => { c[s] = issues.filter((i) => i.status === s).length; });
    return c;
  }, [issues]);

  const stats = useMemo(() => ({
    total:    issues.length,
    open:     issues.filter((i) => ['pending', 'assigned', 'in_progress'].includes(i.status)).length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
    closed:   issues.filter((i) => i.status === 'closed').length,
  }), [issues]);

  const initials  = getInitials(user?.full_name);
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const today     = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  /* ── HERO (rendered above FlatList — extracted so loading screen can share it) ── */
  const Hero = (
    <View style={[styles.hero, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.heroLeft}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ gap: 3 }}>
          <Text style={styles.heroGreeting}>{getGreeting()},</Text>
          <Text style={styles.heroName}>{firstName}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>Community Member</Text>
          </View>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <Text style={styles.heroDate}>{today}</Text>
        <Pressable onPress={logout} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: P.bg }}>
        {Hero}
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading your issues…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: P.bg }}>
      {Hero}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
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
            {/* ── STAT CARDS ── */}
            <View style={styles.statsRow}>
              {[
                { label: 'Total',    value: stats.total,    color: P.primary,  icon: '🗂'  },
                { label: 'Open',     value: stats.open,     color: P.warning,  icon: '⏳'  },
                { label: 'Resolved', value: stats.resolved, color: P.success,  icon: '✅'  },
                { label: 'Closed',   value: stats.closed,   color: '#6B7280',  icon: '🔒'  },
              ].map(({ label, value, color, icon }) => (
                <View key={label} style={[styles.statCard, { borderTopColor: color }]}>
                  <Text style={styles.statIcon}>{icon}</Text>
                  <Text style={[styles.statValue, { color }]}>{value}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* ── STATUS BANNER ── */}
            {issues.length > 0 && stats.open > 0 && (
              <View style={styles.banner}>
                <Text style={styles.bannerIcon}>📋</Text>
                <Text style={styles.bannerText}>
                  You have {stats.open} open {stats.open === 1 ? 'issue' : 'issues'} being tracked.
                </Text>
              </View>
            )}
            {issues.length > 0 && stats.open === 0 && (
              <View style={[styles.banner, styles.bannerSuccess]}>
                <Text style={styles.bannerIcon}>🎉</Text>
                <Text style={[styles.bannerText, styles.bannerSuccessText]}>
                  All your issues have been resolved!
                </Text>
              </View>
            )}

            {/* ── ERROR ── */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={load} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {/* ── FILTER CARD ── */}
            {issues.length > 0 && (
              <View style={styles.filterCard}>
                <Text style={styles.filterEyebrow}>Filter by Status</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  {STATUS_FILTERS.map((s) => {
                    const active = statusFilter === s;
                    const color  = FILTER_COLORS[s] || P.primary;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => setStatusFilter(s)}
                        style={[
                          styles.chip,
                          active && { backgroundColor: color, borderColor: color },
                        ]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {STATUS_LABELS[s]}
                        </Text>
                        <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
                          <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>
                            {counts[s]}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Text style={styles.resultsLabel}>
                  Showing {filtered.length} of {issues.length}{' '}
                  {issues.length === 1 ? 'issue' : 'issues'}
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>
                {statusFilter !== 'all' ? '🔍' : '📭'}
              </Text>
            </View>
            <Text style={styles.emptyTitle}>
              {statusFilter !== 'all' ? 'No matching issues' : 'No issues yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter !== 'all'
                ? 'Try a different filter to see more issues.'
                : 'Tap "Report Issue" to submit your first issue.'}
            </Text>
            {statusFilter !== 'all' && (
              <Pressable onPress={() => setStatusFilter('all')} style={styles.emptyAction}>
                <Text style={styles.emptyActionText}>Show All Issues</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── LOADING ── */
  loadingBody: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: P.textMuted, fontWeight: '500' },

  /* ── HERO ── */
  hero: {
    backgroundColor: P.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 20,
    elevation: 4,
    shadowColor: P.primaryDark,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  heroLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  avatarCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 0.5 },
  heroGreeting: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  heroName: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, alignSelf: 'flex-start',
  },
  rolePillText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700' },
  heroDate: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  signOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
  },
  signOutText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' },

  /* ── LIST ── */
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: 100,
  },

  /* ── STAT CARDS ── */
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: P.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
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
  statIcon:  { fontSize: 16, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: {
    fontSize: 9, color: P.textMuted, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  /* ── BANNERS ── */
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: P.primaryLight,
    borderRadius: 12, padding: SPACING.md,
    marginBottom: SPACING.sm, gap: 10,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  bannerIcon: { fontSize: 16 },
  bannerText: { flex: 1, color: P.primary, fontWeight: '600', fontSize: 13 },
  bannerSuccess:     { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' },
  bannerSuccessText: { color: '#065F46' },

  /* ── ERROR ── */
  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: P.errorLight, borderRadius: 12,
    padding: SPACING.md, marginBottom: SPACING.sm,
    gap: 8, borderWidth: 1, borderColor: '#FECACA',
  },
  errorIcon: { fontSize: 15 },
  errorText: { color: P.error, flex: 1, fontSize: 13, fontWeight: '500' },
  retryBtn:  { backgroundColor: P.error, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  /* ── FILTER CARD ── */
  filterCard: {
    backgroundColor: P.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: P.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  filterEyebrow: {
    fontSize: 10, fontWeight: '800', color: P.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  filterRow: { gap: 8, paddingBottom: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: P.border,
    backgroundColor: P.surface,
  },
  chipText:       { fontSize: 12, color: P.textSub, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  chipBadge: {
    backgroundColor: P.border, borderRadius: 10,
    minWidth: 20, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  chipBadgeActive:     { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipBadgeText:       { fontSize: 10, fontWeight: '800', color: P.textSub },
  chipBadgeTextActive: { color: '#fff' },
  resultsLabel: {
    fontSize: 12, color: P.textMuted, marginTop: 10, fontWeight: '500',
  },

  /* ── EMPTY STATE ── */
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: P.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyIcon:     { fontSize: 34 },
  emptyTitle:    { fontSize: 18, fontWeight: '800', color: P.text, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { color: P.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  emptyAction: {
    marginTop: 16, backgroundColor: P.primary,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  emptyActionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
