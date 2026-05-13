import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';

import { apiGet, apiPut } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { COLORS, SPACING, RADIUS } from '../theme';

export default function IssueDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadIssue();
  }, [id]);

  async function loadIssue() {
    try {
      const data = await apiGet(`/issues/${id}`);
      setIssue(data.issue);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus) {
    try {
      setUpdating(true);
      await apiPut(`/issues/${id}/status`, { status: newStatus });
      loadIssue();
    } catch (err) {
      Alert.alert('Update failed', err.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!issue) return null;

  const locationText = issue.locations 
    ? `${issue.locations.building} - Floor ${issue.locations.floor}, Room ${issue.locations.room}`
    : 'Location not specified';

  return (
    <ScrollView style={styles.container}>
      {issue.photo_url && <Image source={{ uri: issue.photo_url }} style={styles.image} />}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.category}>{issue.category}</Text>
          <Text style={styles.status}>{issue.status?.toUpperCase()}</Text>
        </View>

        <Text style={styles.title}>{issue.title}</Text>
        <Text style={styles.location}>{locationText}</Text>
        <Text style={styles.description}>{issue.description}</Text>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Reported by: {issue.submitter?.name}</Text>
          <Text style={styles.metaText}>Date: {new Date(issue.created_at).toLocaleString()}</Text>
          {issue.worker && <Text style={styles.metaText}>Assigned to: {issue.worker.name}</Text>}
        </View>

        {user.role === 'facility_manager' && issue.status === 'pending' && (
          <Pressable 
            onPress={() => updateStatus('in_progress')} 
            disabled={updating}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>Mark In Progress</Text>
          </Pressable>
        )}

        {user.role === 'worker' && issue.status === 'in_progress' && (
          <Pressable 
            onPress={() => updateStatus('resolved')} 
            disabled={updating}
            style={[styles.actionButton, { backgroundColor: COLORS.success }]}
          >
            <Text style={styles.actionButtonText}>Mark Resolved</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  image: { width: '100%', height: 250, backgroundColor: COLORS.secondary },
  content: { padding: SPACING.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  category: { color: COLORS.primary, fontWeight: 'bold' },
  status: { fontWeight: 'bold', color: COLORS.textSecondary },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: SPACING.xs },
  location: { fontSize: 16, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  description: { fontSize: 16, lineHeight: 24, marginBottom: SPACING.xl },
  meta: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md, marginBottom: SPACING.xl },
  metaText: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
