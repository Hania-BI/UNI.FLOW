import { View, Text, StyleSheet, Pressable } from 'react-native';

// Design tokens — match auth screen palette
const P = {
  primary: '#4F46E5',
  primaryLight: '#EEF2FF',
  text: '#0F172A',
  textSub: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  surface: '#FFFFFF',
};

const STATUS_CONFIG = {
  pending:     { color: '#F59E0B', bg: '#FEF3C7', label: 'Pending' },
  assigned:    { color: '#8B5CF6', bg: '#EDE9FE', label: 'Assigned' },
  in_progress: { color: '#4F46E5', bg: '#EEF2FF', label: 'In Progress' },
  resolved:    { color: '#10B981', bg: '#D1FAE5', label: 'Resolved' },
  closed:      { color: '#6B7280', bg: '#F3F4F6', label: 'Closed' },
};

const CATEGORY_CONFIG = {
  electrical: { icon: '⚡', color: '#F59E0B' },
  plumbing:   { icon: '🔧', color: '#3B82F6' },
  cleaning:   { icon: '🧹', color: '#10B981' },
  furniture:  { icon: '🪑', color: '#8B5CF6' },
  other:      { icon: '📌', color: '#6B7280' },
};

export default function IssueCard({ issue, onPress, showSubmitter = false }) {
  const status = STATUS_CONFIG[issue.status] || { color: '#6B7280', bg: '#F3F4F6', label: issue.status };
  const category = CATEGORY_CONFIG[issue.category] || { icon: '📋', color: '#6B7280' };

  const locationText = issue.location
    ? `${issue.location.building} · Fl ${issue.location.floor}, Rm ${issue.location.room}`
    : 'Location not specified';

  const timeAgo = formatTimeAgo(issue.created_at);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Status-colored left stripe */}
      <View style={[styles.stripe, { backgroundColor: status.color }]} />

      <View style={styles.body}>
        {/* Category + status row */}
        <View style={styles.topRow}>
          <View style={[styles.categoryPill, { backgroundColor: category.color + '18' }]}>
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[styles.categoryText, { color: category.color }]}>
              {issue.category
                ? issue.category.charAt(0).toUpperCase() + issue.category.slice(1)
                : 'Other'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{issue.title}</Text>

        {/* Location */}
        <View style={styles.metaRow}>
          <Text style={styles.metaIcon}>📍</Text>
          <Text style={styles.metaText} numberOfLines={1}>{locationText}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.time}>{timeAgo}</Text>
          <View style={styles.footerRight}>
            {showSubmitter && issue.submitter && (
              <View style={styles.personPill}>
                <Text style={styles.personPillText} numberOfLines={1}>
                  👤 {issue.submitter.full_name}
                </Text>
              </View>
            )}
            {issue.worker && (
              <View style={[styles.personPill, styles.workerPill]}>
                <Text style={[styles.personPillText, styles.workerPillText]} numberOfLines={1}>
                  🔨 {issue.worker.full_name}
                </Text>
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
    backgroundColor: P.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: 1,
    borderColor: P.border,
  },
  cardPressed: { opacity: 0.88 },

  stripe: { width: 5 },

  body: { flex: 1, padding: 14 },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryIcon: { fontSize: 12 },
  categoryText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  title: {
    fontSize: 15,
    fontWeight: '700',
    color: P.text,
    lineHeight: 21,
    marginBottom: 7,
    letterSpacing: -0.1,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  metaIcon: { fontSize: 11 },
  metaText: { fontSize: 12, color: P.textSub, flex: 1, fontWeight: '500' },

  divider: { height: 1, backgroundColor: '#F8F9FF', marginBottom: 9 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: { fontSize: 11, color: P.textMuted, fontWeight: '500' },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },

  personPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    maxWidth: 130,
  },
  personPillText: { fontSize: 11, color: P.textSub, fontWeight: '600' },
  workerPill: { backgroundColor: P.primaryLight },
  workerPillText: { color: P.primary },
});
