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
import { COLORS, SPACING, RADIUS } from '../theme';

const AVATAR_COLORS = [
  '#0066CC', '#9C27B0', '#E91E63', '#00897B', '#F4511E', '#3949AB',
];

function getAvatarColor(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Workers</Text>
          <Text style={styles.headerSubtitle}>{stats.total} registered</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderTopColor: COLORS.primary }]}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: COLORS.success }]}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: COLORS.textSecondary }]}>
          <Text style={[styles.statValue, { color: COLORS.textSecondary }]}>{stats.inactive}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {[
          { key: 'all', label: `All (${stats.total})` },
          { key: 'active', label: `Active (${stats.active})` },
          { key: 'inactive', label: `Inactive (${stats.inactive})` },
        ].map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setFilter(tab.key)}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👷</Text>
            <Text style={styles.emptyTitle}>No workers found</Text>
            <Text style={styles.emptySubtitle}>
              {filter !== 'all' ? 'Try a different filter.' : 'Workers who register will appear here.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const avatarColor = getAvatarColor(item.id);
          const isActive = item.status === 'active';
          return (
            <View style={[styles.card, !isActive && styles.cardInactive]}>
              <View style={[styles.avatar, { backgroundColor: isActive ? avatarColor : COLORS.border }]}>
                <Text style={styles.avatarText}>
                  {item.full_name?.charAt(0).toUpperCase() ?? '?'}
                </Text>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.name}>{item.full_name}</Text>
                  <View style={[styles.statusDot, { backgroundColor: isActive ? COLORS.success : COLORS.border }]} />
                </View>
                <Text style={styles.email}>{item.email}</Text>
                <Text style={styles.since}>
                  Member since {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.toggleWrap}>
                {togglingId === item.id ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Switch
                    value={isActive}
                    onValueChange={() => toggleStatus(item)}
                    trackColor={{ false: '#ddd', true: COLORS.primary + '88' }}
                    thumbColor={isActive ? COLORS.primary : '#aaa'}
                  />
                )}
                <Text style={[styles.toggleLabel, { color: isActive ? COLORS.success : COLORS.textSecondary }]}>
                  {isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.lg,
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

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterTabTextActive: { color: '#fff' },

  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFEBEE',
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  errorText: { color: COLORS.error, flex: 1, marginRight: SPACING.sm },
  retryText: { color: COLORS.primary, fontWeight: '600' },

  listContent: { padding: SPACING.lg, paddingTop: SPACING.sm },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: SPACING.xs },
  emptySubtitle: { color: COLORS.textSecondary, textAlign: 'center' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardInactive: { opacity: 0.65 },

  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },

  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 3 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  email: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 3 },
  since: { fontSize: 11, color: COLORS.border, fontWeight: '500' },

  toggleWrap: { alignItems: 'center', gap: 4 },
  toggleLabel: { fontSize: 10, fontWeight: '700' },
});
