import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiGet } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import IssueCard from '../components/IssueCard';
import { COLORS, SPACING, RADIUS } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setError(null);
      const endpoint = user.role === 'community_member' ? '/issues/my' : '/issues';
      const data = await apiGet(endpoint);
      setIssues(data.issues);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <View>
          <Text style={styles.headerTitle}>
            {user.role === 'community_member' ? 'My Issues' : 'Campus Issues'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {issues.length} {issues.length === 1 ? 'issue' : 'issues'} reported
          </Text>
        </View>
        <Pressable onPress={logout} style={styles.logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <FlatList
        data={issues}
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No issues found</Text>
            <Text style={styles.emptySubtitle}>
              {user.role === 'community_member' 
                ? 'Reporting an issue helps keep our campus safe.' 
                : 'All clear! No issues to display.'}
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
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  headerSubtitle: { fontSize: 14, color: COLORS.textSecondary },
  logout: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutText: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: SPACING.lg },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: SPACING.xs },
  emptySubtitle: { color: COLORS.textSecondary, textAlign: 'center' },
});
