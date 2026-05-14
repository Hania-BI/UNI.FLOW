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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { apiGet, apiPost, apiPut, apiUpload } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { COLORS, SPACING, RADIUS } from '../theme';

const STATUS_COLORS = {
  pending: COLORS.warning,
  assigned: '#9C27B0',
  in_progress: COLORS.primary,
  resolved: COLORS.success,
  closed: COLORS.textSecondary,
};

export default function IssueDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [silentLoading, setSilentLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => { loadIssue(); }, [id]);

  // Initial load — shows full spinner, navigates back on error
  async function loadIssue() {
    try {
      setLoading(true);
      const data = await apiGet(`/issues/${id}`);
      setIssue(data.issue);
    } catch (err) {
      Alert.alert('Error', err.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  // Silent refresh after actions — keeps existing UI visible, no navigate-back on error
  async function refresh() {
    try {
      setSilentLoading(true);
      const data = await apiGet(`/issues/${id}`);
      setIssue(data.issue);
    } catch {
      // keep stale data shown, don't navigate away
    } finally {
      setSilentLoading(false);
    }
  }

  async function updateStatus(newStatus) {
    try {
      setUpdating(true);
      await apiPut(`/issues/${id}/status`, { status: newStatus });
      await refresh();
      Alert.alert('Updated', `Status changed to ${newStatus.replace('_', ' ')}.`);
    } catch (err) {
      Alert.alert('Update failed', err.message);
    } finally {
      setUpdating(false);
    }
  }

  // FM only — uses the dedicated /close endpoint which sets closed_at
  async function closeIssue() {
    try {
      setUpdating(true);
      await apiPut(`/issues/${id}/close`, {});
      await refresh();
      Alert.alert('Closed', 'Issue has been closed.');
    } catch (err) {
      Alert.alert('Failed', err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function submitComment() {
    if (!commentText.trim()) {
      Alert.alert('Empty comment', 'Please write something first.');
      return;
    }
    try {
      setSubmittingComment(true);
      await apiPost(`/issues/${id}/comments`, { body: commentText.trim() });
      setCommentText('');
      await refresh();
    } catch (err) {
      Alert.alert('Comment failed', err.message);
    } finally {
      setSubmittingComment(false);
    }
  }

  async function pickAndUploadPhoto() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Go to Settings → CampusCare → Photos and allow access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (result.canceled) return;

      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('photo', {
        uri: result.assets[0].uri,
        name: 'completion.jpg',
        type: 'image/jpeg',
      });

      await apiUpload(`/issues/${id}/photo`, formData);
      Alert.alert('Success', 'Completion photo uploaded.');
      await refresh();
    } catch (err) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!issue) return null;

  const isWorker = user.role === 'worker';
  const isMyIssue = issue.worker?.id === user.id;
  const isFM = user.role === 'facility_manager';

  const locationText = issue.location
    ? `${issue.location.building} — Floor ${issue.location.floor}, Room ${issue.location.room}`
    : 'Location not specified';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

        {/* Issue photo */}
        {issue.photo_url ? (
          <Image source={{ uri: issue.photo_url }} style={styles.image} />
        ) : null}

        <View style={styles.content}>

          {/* Header row */}
          <View style={styles.headerRow}>
            <Text style={styles.category}>{issue.category?.toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[issue.status] || COLORS.secondary }]}>
              <Text style={styles.statusText}>{issue.status?.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.title}>{issue.title}</Text>
          <Text style={styles.location}>{locationText}</Text>
          <Text style={styles.description}>{issue.description}</Text>

          {/* Meta */}
          <View style={styles.meta}>
            <Text style={styles.metaText}>Reported by: {issue.submitter?.full_name}</Text>
            <Text style={styles.metaText}>Date: {new Date(issue.created_at).toLocaleString()}</Text>
            {issue.worker && (
              <Text style={styles.metaText}>Assigned to: {issue.worker.full_name}</Text>
            )}
          </View>

          {/* ── WORKER ACTIONS ── */}

          {/* Start Work: assigned → in_progress */}
          {isWorker && isMyIssue && issue.status === 'assigned' && (
            <Pressable
              onPress={() => updateStatus('in_progress')}
              disabled={updating}
              style={[styles.actionBtn, { backgroundColor: COLORS.primary }, updating && styles.disabled]}
            >
              {updating
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.actionBtnText}>Start Work</Text>}
            </Pressable>
          )}

          {/* In-progress worker actions */}
          {isWorker && isMyIssue && issue.status === 'in_progress' && (
            <>
              {/* Completion photo */}
              <Text style={styles.sectionTitle}>Completion Photo</Text>
              {issue.completion_photo_url ? (
                <Image source={{ uri: issue.completion_photo_url }} style={styles.completionImage} />
              ) : null}
              <Pressable
                onPress={pickAndUploadPhoto}
                disabled={uploadingPhoto}
                style={[styles.outlineBtn, uploadingPhoto && styles.disabled]}
              >
                {uploadingPhoto
                  ? <ActivityIndicator color={COLORS.primary} />
                  : <Text style={styles.outlineBtnText}>
                      {issue.completion_photo_url ? 'Replace Photo' : 'Upload Completion Photo'}
                    </Text>}
              </Pressable>

              {/* Mark Resolved */}
              <Pressable
                onPress={() => updateStatus('resolved')}
                disabled={updating}
                style={[styles.actionBtn, { backgroundColor: COLORS.success }, updating && styles.disabled]}
              >
                {updating
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.actionBtnText}>Mark Resolved</Text>}
              </Pressable>
            </>
          )}

          {/* FM: close resolved issue — uses /close endpoint to set closed_at */}
          {isFM && issue.status === 'resolved' && (
            <Pressable
              onPress={closeIssue}
              disabled={updating}
              style={[styles.actionBtn, { backgroundColor: COLORS.textSecondary }, updating && styles.disabled]}
            >
              {updating
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.actionBtnText}>Close Issue</Text>}
            </Pressable>
          )}

          {/* Silent refresh indicator */}
          {silentLoading && (
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
              style={{ alignSelf: 'center', marginVertical: SPACING.sm }}
            />
          )}

          {/* ── COMMENTS ── */}
          <Text style={styles.sectionTitle}>
            Comments ({issue.comments?.length ?? 0})
          </Text>

          {issue.comments?.length === 0 && (
            <Text style={styles.emptyComments}>No comments yet.</Text>
          )}

          {issue.comments?.map((c) => (
            <View key={c.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{c.author?.full_name}</Text>
                <Text style={styles.commentRole}>{c.author?.role?.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.commentBody}>{c.body}</Text>
              <Text style={styles.commentDate}>
                {new Date(c.created_at).toLocaleString()}
              </Text>
            </View>
          ))}

          {/* Comment composer — workers on own issue + FM */}
          {((isWorker && isMyIssue) || isFM) && issue.status !== 'closed' && (
            <View style={styles.commentComposer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment…"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <Pressable
                onPress={submitComment}
                disabled={submittingComment}
                style={[styles.commentSubmitBtn, submittingComment && styles.disabled]}
              >
                {submittingComment
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.commentSubmitText}>Post</Text>}
              </Pressable>
            </View>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 220, backgroundColor: COLORS.border },
  content: { padding: SPACING.lg },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  category: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.xs },
  location: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.md },
  description: { fontSize: 15, lineHeight: 22, color: COLORS.text, marginBottom: SPACING.lg },

  meta: {
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: SPACING.md, marginBottom: SPACING.lg,
  },
  metaText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text,
    marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },

  actionBtn: {
    paddingVertical: 14, borderRadius: RADIUS.md,
    alignItems: 'center', marginBottom: SPACING.md,
  },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  outlineBtn: {
    paddingVertical: 13, borderRadius: RADIUS.md,
    alignItems: 'center', marginBottom: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  outlineBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },

  completionImage: {
    width: '100%', height: 180, borderRadius: RADIUS.md,
    marginBottom: SPACING.md, backgroundColor: COLORS.border,
  },

  disabled: { opacity: 0.55 },

  emptyComments: { color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: SPACING.md },

  commentCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { fontWeight: '700', color: COLORS.text, fontSize: 13 },
  commentRole: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'capitalize' },
  commentBody: { fontSize: 14, color: COLORS.text, lineHeight: 20, marginBottom: 4 },
  commentDate: { fontSize: 11, color: COLORS.textSecondary },

  commentComposer: {
    marginTop: SPACING.md, flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm,
  },
  commentInput: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md,
    fontSize: 14, color: COLORS.text, backgroundColor: COLORS.surface,
    maxHeight: 100, minHeight: 48,
  },
  commentSubmitBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md,
    paddingVertical: 13, borderRadius: RADIUS.md, minWidth: 60, alignItems: 'center',
  },
  commentSubmitText: { color: '#fff', fontWeight: '700' },
});
