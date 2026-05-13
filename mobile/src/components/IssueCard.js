import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../theme';

export default function IssueCard({ issue, onPress }) {
  const statusColors = {
    pending: COLORS.pending,
    in_progress: COLORS.in_progress,
    resolved: COLORS.resolved,
    closed: COLORS.closed,
  };

  // The backend now returns nested location data
  const locationText = issue.locations 
    ? `${issue.locations.building} - Floor ${issue.locations.floor}, Room ${issue.locations.room}`
    : 'Location not specified';

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.category}>{issue.category}</Text>
        <View style={[styles.badge, { backgroundColor: statusColors[issue.status] || COLORS.secondary }]}>
          <Text style={styles.badgeText}>{issue.status?.replace('_', ' ')}</Text>
        </View>
      </View>
      
      <Text style={styles.title} numberOfLines={1}>{issue.title}</Text>
      <Text style={styles.location}>{locationText}</Text>
      
      <View style={styles.footer}>
        <Text style={styles.date}>{new Date(issue.created_at).toLocaleDateString()}</Text>
        {issue.worker && <Text style={styles.worker}>Assigned to: {issue.worker.name}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  category: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  date: { fontSize: 12, color: COLORS.textSecondary },
  worker: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
});
