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

const STATUS_FILTERS = ['all', 'pending', 'assigned', 'in_progress', 'resolved', 'closed'];
const STATUS_LABELS = {
  all: 'All', pending: 'Pending', assigned: 'Assigned',
  in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
};
const STATUS_COLORS = {
  pending: '#FF9800', assigned: '#9C27B0',
  in_progress: COLORS.primary, resolved: COLORS.success, closed: COLORS.textSecondary,
};

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
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

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const openCount = issues.filter((i) => !['resolved', 'closed'].includes(i.status)).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
          <Text style={styles.headerTitle}>My Issues</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={
          <>
            {/* Summary banner */}
            {issues.length > 0 && (
              <View style={styles.summaryBanner}>
                <Text style={styles.summaryText}>
                  {openCount > 0
                    ? `You have ${openCount} open ${openCount === 1 ? 'issue' : 'issues'} being tracked.`
                    : 'All your issues have been resolved! 🎉'}
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={load}><Text style={styles.retryText}>Retry</Text></Pressable>
              </View>
            )}

            {/* Status filter chips */}
            {issues.length > 0 && (
              <>
                <Text style={styles.filterLabel}>Filter by status</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  {STATUS_FILTERS.map((s) => {
                    const active = statusFilter === s;
                    const color = s === 'all' ? COLORS.primary : (STATUS_COLORS[s] || COLORS.primary);
                    return (
                      <Pressable
                        key={s}
                        onPress={() => setStatusFilter(s)}
                        style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {STATUS_LABELS[s]}
                        </Text>
                        {counts[s] > 0 && (
                          <View style={[styles.badge, active && styles.badgeActive]}>
                            <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                              {counts[s]}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Text style={styles.resultsLabel}>
                  Showing {filtered.length} of {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
                </Text>
              </>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              {statusFilter !== 'all' ? '🔍' : '✅'}
            </Text>
            <Text style={styles.emptyTitle}>
              {statusFilter !== 'all' ? 'No matching issues' : 'No issues yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter !== 'all'
                ? 'Try a different filter.'
                : 'Use the Report Issue tab to submit a new issue.'}
            </Text>
          </View>
        }
      />
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

  summaryBanner: {
    backgroundColor: COLORS.primary + '12',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  summaryText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },

  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
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
  chipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  badge: {
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  badgeTextActive: { color: '#fff' },
  resultsLabel: {
    fontSize: 12, color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },

  errorBanner: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#FFEBEE', padding: SPACING.md,
    marginHorizontal: SPACING.lg, marginTop: SPACING.sm, borderRadius: RADIUS.md,
  },
  errorText: { color: COLORS.error, flex: 1, marginRight: SPACING.sm },
  retryText: { color: COLORS.primary, fontWeight: '600' },

  listContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xl },

  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: SPACING.xs },
  emptySubtitle: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});
