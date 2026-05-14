import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../theme';

const STATUS_COLORS = {
  pending: '#FF9800',
  assigned: '#9C27B0',
  in_progress: COLORS.primary,
  resolved: COLORS.success,
  closed: COLORS.textSecondary,
};

const STATUS_LABELS = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const CATEGORY_ICONS = {
  electrical: '⚡',
  plumbing: '🔧',
  cleaning: '🧹',
  furniture: '🪑',
  other: '📌',
};

export default function IssueCard({ issue, onPress, showSubmitter = false }) {
  const statusColor = STATUS_COLORS[issue.status] || COLORS.secondary;

  const locationText = issue.location
    ? `${issue.location.building} · Floor ${issue.location.floor}, Room ${issue.location.room}`
    : 'Location not specified';

  const icon = CATEGORY_ICONS[issue.category] ?? '📋';
  const timeAgo = formatTimeAgo(issue.created_at);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Colored left accent */}
      <View style={[styles.accent, { backgroundColor: statusColor }]} />

      <View style={styles.body}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={styles.categoryRow}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.category}>{issue.category?.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[issue.status] ?? issue.status}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{issue.title}</Text>

        {/* Location */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText} numberOfLines={1}>{locationText}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.time}>{timeAgo}</Text>
          <View style={styles.footerRight}>
            {showSubmitter && issue.submitter && (
              <Text style={styles.submitter} numberOfLines={1}>
                👤 {issue.submitter.full_name}
              </Text>
            )}
            {issue.worker && (
              <View style={styles.workerPill}>
                <Text style={styles.workerText}>🔨 {issue.worker.full_name}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardPressed: { opacity: 0.85 },

  accent: { width: 4 },

  body: { flex: 1, padding: SPACING.md },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  icon: { fontSize: 13 },
  category: {
    fontSize: 11, fontWeight: '700',
    color: COLORS.textSecondary, letterSpacing: 0.5,
  },

  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '700' },

  title: {
    fontSize: 15, fontWeight: '600',
    color: COLORS.text, marginBottom: 6, lineHeight: 20,
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.sm },
  infoIcon: { fontSize: 11 },
  infoText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.xs,
  },
  time: { fontSize: 11, color: COLORS.textSecondary },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1, justifyContent: 'flex-end' },
  submitter: { fontSize: 11, color: COLORS.textSecondary, maxWidth: 120 },
  workerPill: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  workerText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
});
