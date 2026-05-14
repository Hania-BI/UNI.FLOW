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
import { COLORS, SPACING, RADIUS } from '../theme';

const STATUSES = ['all', 'pending', 'assigned', 'in_progress', 'resolved', 'closed'];
const CATEGORIES = ['all', 'electrical', 'plumbing', 'cleaning', 'furniture', 'other'];

const STATUS_LABEL = {
  all: 'All', pending: 'Pending', assigned: 'Assigned',
  in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
};

const STATUS_COLORS = {
  pending: '#FF9800',
  assigned: '#9C27B0',
  in_progress: COLORS.primary,
  resolved: COLORS.success,
  closed: COLORS.textSecondary,
};

const CATEGORY_ICONS = {
  all: '📋', electrical: '⚡', plumbing: '🔧', cleaning: '🧹', furniture: '🪑', other: '📌',
};

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
    in_progress: issues.filter((i) => i.status === 'in_progress' || i.status === 'assigned').length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
  }), [issues]);

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      const matchStatus = statusFilter === 'all' || issue.status === statusFilter;
      const matchCategory = categoryFilter === 'all' || issue.category === categoryFilter;
      return matchStatus && matchCategory;
    });
  }, [issues, statusFilter, categoryFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: issues.length };
    STATUSES.slice(1).forEach((s) => {
      counts[s] = issues.filter((i) => i.status === s).length;
    });
    return counts;
  }, [issues]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] ?? 'Manager';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <View>
          <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
          <Text style={styles.headerTitle}>Campus Issues</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatCard label="Total" value={stats.total} color={COLORS.primary} />
              <StatCard label="Pending" value={stats.pending} color={STATUS_COLORS.pending} />
              <StatCard label="Active" value={stats.in_progress} color={STATUS_COLORS.in_progress} />
              <StatCard label="Resolved" value={stats.resolved} color={STATUS_COLORS.resolved} />
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={load}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {/* Status filter */}
            <Text style={styles.filterLabel}>Status</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {STATUSES.map((s) => {
                const active = statusFilter === s;
                const color = s === 'all' ? COLORS.primary : (STATUS_COLORS[s] || COLORS.primary);
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatusFilter(s)}
                    style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
            <Text style={styles.filterLabel}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.filterRow, { marginBottom: SPACING.md }]}
            >
              {CATEGORIES.map((c) => {
                const active = categoryFilter === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategoryFilter(c)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={styles.chipIcon}>{CATEGORY_ICONS[c]}</Text>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.resultsLabel}>
              {filtered.length} {filtered.length === 1 ? 'issue' : 'issues'}
              {(statusFilter !== 'all' || categoryFilter !== 'all') ? ' found' : ' total'}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No issues found</Text>
            <Text style={styles.emptySubtitle}>Try changing the filters above.</Text>
          </View>
        }
      />
    </View>
  );
}

function StatCard({ label, value, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  greeting: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  logoutBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500' },

  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipIcon: { fontSize: 13 },
  chipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  chipCount: {
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  chipCountText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  chipCountTextActive: { color: '#fff' },

  resultsLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    fontWeight: '500',
  },

  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFEBEE',
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  errorText: { color: COLORS.error, flex: 1, marginRight: SPACING.sm },
  retryText: { color: COLORS.primary, fontWeight: '600' },

  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: SPACING.xs },
  emptySubtitle: { color: COLORS.textSecondary, textAlign: 'center' },
});
