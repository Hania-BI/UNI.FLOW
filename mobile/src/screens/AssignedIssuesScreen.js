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

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'assigned', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

const FILTER_COLORS = {
  assigned: '#9C27B0',
  in_progress: COLORS.primary,
  resolved: COLORS.success,
};

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

  function onRefresh() {
    setRefreshing(true);
    load();
  }

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

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] ?? 'Worker';
  const urgentCount = counts.assigned;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
          <Text style={styles.headerTitle}>My Tasks</Text>
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
            onPress={() => navigation.navigate('IssueDetail', { id: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              <StatPill label="Total" value={counts.all} color={COLORS.primary} />
              <StatPill label="To Do" value={counts.assigned} color={FILTER_COLORS.assigned} />
              <StatPill label="In Progress" value={counts.in_progress} color={FILTER_COLORS.in_progress} />
              <StatPill label="Resolved" value={counts.resolved} color={FILTER_COLORS.resolved} />
            </View>

            {urgentCount > 0 && (
              <View style={styles.alertBanner}>
                <Text style={styles.alertText}>
                  🔔 {urgentCount} {urgentCount === 1 ? 'task' : 'tasks'} waiting to be started
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={load}><Text style={styles.retryText}>Retry</Text></Pressable>
              </View>
            )}

            {/* Filter tabs */}
            {issues.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {FILTERS.map((f) => {
                  const active = filter === f.key;
                  const color = FILTER_COLORS[f.key] || COLORS.primary;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setFilter(f.key)}
                      style={[styles.filterChip, active && { backgroundColor: color, borderColor: color }]}
                    >
                      <Text style={[styles.filterText, active && styles.filterTextActive]}>
                        {f.label}
                      </Text>
                      <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                        <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                          {counts[f.key]}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{filter !== 'all' ? '🔍' : '🎉'}</Text>
            <Text style={styles.emptyTitle}>
              {filter !== 'all' ? 'No tasks here' : 'No tasks assigned'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter !== 'all'
                ? 'Try a different filter.'
                : 'Issues assigned to you will appear here.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function StatPill({ label, value, color }) {
  return (
    <View style={[styles.statPill, { borderTopColor: color }]}>
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  statPill: {
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
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, fontWeight: '600' },

  alertBanner: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  alertText: { color: '#E65100', fontWeight: '600', fontSize: 13 },

  filterRow: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  filterChip: {
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
  filterText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  filterBadge: {
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  filterBadgeTextActive: { color: '#fff' },

  errorBanner: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#FFEBEE', padding: SPACING.md,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, borderRadius: RADIUS.md,
  },
  errorText: { color: COLORS.error, flex: 1, marginRight: SPACING.sm },
  retryText: { color: COLORS.primary, fontWeight: '600' },

  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },

  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: SPACING.xs },
  emptySubtitle: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});
