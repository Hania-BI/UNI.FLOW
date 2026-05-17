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
  Modal,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { apiGet, apiPost, apiPut, apiUpload } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { SPACING } from '../theme';

const P = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primaryLight: '#EEF2FF',
  bg: '#F8F9FF',
  surface: '#FFFFFF',
  text: '#0F172A',
  textSub: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  success: '#10B981',
  successLight: '#D1FAE5',
};

const STATUS_CONFIG = {
  pending:     { color: '#F59E0B', bg: '#FEF3C7', label: 'Pending' },
  assigned:    { color: '#8B5CF6', bg: '#EDE9FE', label: 'Assigned' },
  in_progress: { color: '#4F46E5', bg: '#EEF2FF', label: 'In Progress' },
  resolved:    { color: '#10B981', bg: '#D1FAE5', label: 'Resolved' },
  closed:      { color: '#6B7280', bg: '#F3F4F6', label: 'Closed' },
};

const CATEGORY_ICONS = {
  electrical: '⚡', plumbing: '🔧', cleaning: '🧹', furniture: '🪑', other: '📌',
};

const AVATAR_COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#10B981', '#F59E0B', '#6366F1'];
function getAvatarColor(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  useEffect(() => { loadIssue(); }, [id]);

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

  async function refresh() {
    try {
      setSilentLoading(true);
      const data = await apiGet(`/issues/${id}`);
      setIssue(data.issue);
    } catch { /* keep stale data */ } finally {
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

  async function openAssignModal() {
    setShowAssignModal(true);
    try {
      setLoadingWorkers(true);
      const data = await apiGet('/manager/workers');
      setWorkers(data.workers.filter((w) => w.status === 'active'));
    } catch (err) {
      Alert.alert('Error', err.message);
      setShowAssignModal(false);
    } finally {
      setLoadingWorkers(false);
    }
  }

  async function handleAssign(workerId) {
    try {
      setShowAssignModal(false);
      setUpdating(true);
      await apiPut(`/issues/${id}/assign`, { workerId });
      await refresh();
      Alert.alert('Assigned', 'Worker has been assigned to this issue.');
    } catch (err) {
      Alert.alert('Assignment failed', err.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={P.primary} />
        <Text style={styles.loadingText}>Loading issue…</Text>
      </View>
    );
  }

  if (!issue) return null;

  const isWorker = user.role === 'worker';
  const isMyIssue = issue.worker?.id === user.id;
  const isFM = user.role === 'facility_manager';

  const status = STATUS_CONFIG[issue.status] || { color: '#6B7280', bg: '#F3F4F6', label: issue.status };
  const categoryIcon = CATEGORY_ICONS[issue.category] ?? '📋';

  const locationText = issue.location
    ? `${issue.location.building} — Floor ${issue.location.floor}, Room ${issue.location.room}`
    : 'Location not specified';

  const createdDate = new Date(issue.created_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO IMAGE / PLACEHOLDER ── */}
        {issue.photo_url ? (
          <Image source={{ uri: issue.photo_url }} style={styles.heroImage} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderIcon}>{categoryIcon}</Text>
            <Text style={styles.heroPlaceholderText}>No photo attached</Text>
          </View>
        )}

        <View style={styles.content}>

          {/* ── BADGE ROW ── */}
          <View style={styles.badgeRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillIcon}>{categoryIcon}</Text>
              <Text style={styles.categoryPillText}>
                {issue.category
                  ? issue.category.charAt(0).toUpperCase() + issue.category.slice(1)
                  : 'Other'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          {/* ── TITLE ── */}
          <Text style={styles.title}>{issue.title}</Text>

          {/* ── WORKFLOW TRACKER (worker only) ── */}
          {isWorker && isMyIssue && (
            <WorkflowTracker status={issue.status} />
          )}

          {/* ── INFO CARD ── */}
          <View style={styles.infoCard}>
            <InfoRow icon="📍" label="Location" value={locationText} />
            <View style={styles.infoCardDivider} />
            <InfoRow icon="🗓" label="Reported" value={createdDate} />
            {issue.submitter && (
              <>
                <View style={styles.infoCardDivider} />
                <InfoRow icon="👤" label="Submitted by" value={issue.submitter.full_name} />
              </>
            )}
            {issue.worker && (
              <>
                <View style={styles.infoCardDivider} />
                <InfoRow icon="🔨" label="Assigned to" value={issue.worker.full_name} highlight />
              </>
            )}
          </View>

          {/* ── DESCRIPTION ── */}
          {!!issue.description && (
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Description</Text>
              <View style={styles.descCard}>
                <Text style={styles.descText}>{issue.description}</Text>
              </View>
            </View>
          )}

          {/* ── SILENT LOADING ── */}
          {silentLoading && (
            <View style={styles.silentLoader}>
              <ActivityIndicator size="small" color={P.primary} />
              <Text style={styles.silentLoaderText}>Updating…</Text>
            </View>
          )}

          {/* ── WORKER: START WORK ── */}
          {isWorker && isMyIssue && issue.status === 'assigned' && (
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Next Step</Text>
              <View style={styles.startWorkCard}>
                <View style={styles.startWorkIconWrap}>
                  <Text style={styles.startWorkIcon}>▶</Text>
                </View>
                <View style={styles.startWorkBody}>
                  <Text style={styles.startWorkTitle}>Ready to begin?</Text>
                  <Text style={styles.startWorkDesc}>
                    Confirm you're on-site and starting this task. Your status will update to "In Progress".
                  </Text>
                </View>
                <Pressable
                  onPress={() => updateStatus('in_progress')}
                  disabled={updating}
                  style={[styles.startWorkBtn, updating && { opacity: 0.55 }]}
                >
                  {updating
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.startWorkBtnText}>Start Work</Text>}
                </Pressable>
              </View>
            </View>
          )}

          {/* ── WORKER: COMPLETION ── */}
          {isWorker && isMyIssue && issue.status === 'in_progress' && (
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Complete Task</Text>

              {/* Photo zone */}
              <View style={styles.photoSection}>
                <View style={styles.photoSectionHeader}>
                  <Text style={styles.photoSectionTitle}>Completion Photo</Text>
                  {issue.completion_photo_url && (
                    <View style={styles.photoUploadedPill}>
                      <Text style={styles.photoUploadedPillText}>✓ Uploaded</Text>
                    </View>
                  )}
                </View>

                {issue.completion_photo_url ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image
                      source={{ uri: issue.completion_photo_url }}
                      style={styles.completionImage}
                    />
                    <Pressable
                      onPress={pickAndUploadPhoto}
                      disabled={uploadingPhoto}
                      style={[styles.replacePhotoBtn, uploadingPhoto && { opacity: 0.55 }]}
                    >
                      {uploadingPhoto
                        ? <ActivityIndicator color={P.primary} size="small" />
                        : <Text style={styles.replacePhotoBtnText}>📷  Replace Photo</Text>}
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={pickAndUploadPhoto}
                    disabled={uploadingPhoto}
                    style={[styles.uploadZone, uploadingPhoto && { opacity: 0.65 }]}
                  >
                    {uploadingPhoto ? (
                      <View style={styles.uploadZoneInner}>
                        <ActivityIndicator color={P.primary} />
                        <Text style={styles.uploadZoneUploading}>Uploading…</Text>
                      </View>
                    ) : (
                      <View style={styles.uploadZoneInner}>
                        <View style={styles.uploadZoneIconWrap}>
                          <Text style={styles.uploadZoneIcon}>📷</Text>
                        </View>
                        <Text style={styles.uploadZoneTitle}>Add Completion Photo</Text>
                        <Text style={styles.uploadZoneSub}>Tap to select from your gallery</Text>
                      </View>
                    )}
                  </Pressable>
                )}
              </View>

              {/* Mark resolved */}
              <SolidButton
                label="Mark as Resolved"
                icon="✅"
                color={P.success}
                loading={updating}
                onPress={() => updateStatus('resolved')}
              />
            </View>
          )}

          {/* ── FM ACTIONS ── */}
          {isFM && issue.status !== 'closed' && (
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>FM Actions</Text>
              <OutlineButton
                label={issue.worker ? 'Reassign Worker' : 'Assign Worker'}
                icon="👷"
                loading={updating}
                onPress={openAssignModal}
              />
              {issue.status === 'resolved' && (
                <SolidButton
                  label="Close Issue"
                  icon="🔒"
                  color="#6B7280"
                  loading={updating}
                  onPress={closeIssue}
                />
              )}
            </View>
          )}

          {/* ── COMMENTS ── */}
          <View style={styles.section}>
            <View style={styles.commentsHeader}>
              <Text style={styles.sectionEyebrow}>Comments</Text>
              <View style={styles.commentCountBadge}>
                <Text style={styles.commentCountText}>{issue.comments?.length ?? 0}</Text>
              </View>
            </View>

            {!issue.comments?.length && (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsIcon}>💬</Text>
                <Text style={styles.emptyCommentsText}>No comments yet.</Text>
              </View>
            )}

            {issue.comments?.map((c) => {
              const ac = getAvatarColor(c.author?.id ?? '');
              return (
                <View key={c.id} style={styles.commentCard}>
                  <View style={[styles.commentAvatar, { backgroundColor: ac }]}>
                    <Text style={styles.commentAvatarText}>
                      {c.author?.full_name?.charAt(0).toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>{c.author?.full_name}</Text>
                      <Text style={styles.commentRole}>
                        {c.author?.role?.replace('_', ' ')}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{c.body}</Text>
                    <Text style={styles.commentDate}>{new Date(c.created_at).toLocaleString()}</Text>
                  </View>
                </View>
              );
            })}

            {/* Comment composer — workers on own issue + FM */}
            {((isWorker && isMyIssue) || isFM) && issue.status !== 'closed' && (
              <View style={styles.composer}>
                <TextInput
                  style={styles.composerInput}
                  placeholder="Add a comment…"
                  placeholderTextColor={P.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                <Pressable
                  onPress={submitComment}
                  disabled={submittingComment}
                  style={[styles.composerSend, submittingComment && { opacity: 0.55 }]}
                >
                  {submittingComment
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.composerSendText}>Post</Text>}
                </Pressable>
              </View>
            )}
          </View>

          <View style={{ height: SPACING.xl }} />
        </View>
      </ScrollView>

      {/* ── ASSIGN WORKER MODAL ── */}
      <Modal
        visible={showAssignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Worker</Text>
                <Text style={styles.modalSubtitle}>Active workers only</Text>
              </View>
              <Pressable onPress={() => setShowAssignModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            {loadingWorkers ? (
              <View style={{ padding: SPACING.xl, alignItems: 'center', gap: 12 }}>
                <ActivityIndicator size="large" color={P.primary} />
                <Text style={styles.loadingText}>Loading workers…</Text>
              </View>
            ) : workers.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyIcon}>👷</Text>
                <Text style={styles.modalEmptyText}>No active workers available.</Text>
              </View>
            ) : (
              <FlatList
                data={workers}
                keyExtractor={(w) => w.id}
                contentContainerStyle={{ paddingBottom: SPACING.xl }}
                renderItem={({ item }) => {
                  const isCurrent = issue.worker?.id === item.id;
                  const ac = getAvatarColor(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.workerRow, isCurrent && styles.workerRowActive]}
                      onPress={() => handleAssign(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.workerAvatar, { backgroundColor: ac }]}>
                        <Text style={styles.workerAvatarText}>
                          {item.full_name?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.workerName}>{item.full_name}</Text>
                        <Text style={styles.workerEmail}>{item.email}</Text>
                      </View>
                      {isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/* ── Sub-components ── */

function WorkflowTracker({ status }) {
  const ORDER = ['assigned', 'in_progress', 'resolved'];
  const INFO  = { assigned: 'To Do', in_progress: 'In Progress', resolved: 'Done' };
  const ci = ORDER.indexOf(status);

  return (
    <View style={styles.trackerCard}>
      <Text style={styles.trackerEyebrow}>Task Progress</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {ORDER.map((key, idx) => {
          const done   = idx < ci;
          const active = idx === ci;
          const isLast = idx === ORDER.length - 1;
          const dotColor   = done ? P.success : active ? P.primary : P.border;
          const labelColor = done ? P.success : active ? P.primary : P.textMuted;
          return (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'flex-start', flex: isLast ? 0 : 1 }}>
              {/* Dot + label column */}
              <View style={{ alignItems: 'center', width: 56 }}>
                <View style={[
                  styles.trackerDot,
                  { backgroundColor: dotColor },
                  active && styles.trackerDotActiveShadow,
                ]}>
                  <Text style={styles.trackerDotText}>{done ? '✓' : (idx + 1).toString()}</Text>
                </View>
                <Text style={[styles.trackerLabel, { color: labelColor }]}>{INFO[key]}</Text>
              </View>
              {/* Connector line */}
              {!isLast && (
                <View style={[
                  styles.trackerLine,
                  { backgroundColor: done ? P.success : P.border },
                ]} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value, highlight = false }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowIcon}>{icon}</Text>
      <View style={styles.infoRowBody}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={[styles.infoRowValue, highlight && styles.infoRowValueHighlight]}>{value}</Text>
      </View>
    </View>
  );
}

function SolidButton({ label, icon, color, loading, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.solidBtn, { backgroundColor: color }, loading && { opacity: 0.55 }]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Text style={styles.solidBtnIcon}>{icon}</Text>
          <Text style={styles.solidBtnText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function OutlineButton({ label, icon, loading, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.outlineBtn, loading && { opacity: 0.55 }]}
    >
      {loading ? (
        <ActivityIndicator color={P.primary} />
      ) : (
        <>
          <Text style={styles.outlineBtnIcon}>{icon}</Text>
          <Text style={styles.outlineBtnText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: P.bg, gap: 12 },
  loadingText: { fontSize: 14, color: P.textMuted, fontWeight: '500' },

  /* ── HERO ── */
  heroImage: { width: '100%', height: 230, backgroundColor: P.border },
  heroPlaceholder: {
    width: '100%', height: 160,
    backgroundColor: P.primaryLight,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  heroPlaceholderIcon: { fontSize: 40 },
  heroPlaceholderText: { fontSize: 13, color: P.textMuted, fontWeight: '500' },

  content: { padding: SPACING.lg, gap: SPACING.md },

  /* ── BADGES ── */
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  categoryPillIcon: { fontSize: 13 },
  categoryPillText: { fontSize: 12, fontWeight: '700', color: P.textSub },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  /* ── TITLE ── */
  title: {
    fontSize: 22, fontWeight: '800', color: P.text,
    lineHeight: 28, letterSpacing: -0.3,
  },

  /* ── WORKFLOW TRACKER ── */
  trackerCard: {
    backgroundColor: P.surface,
    borderRadius: 14, padding: SPACING.md,
    borderWidth: 1, borderColor: P.border,
    elevation: 1, shadowColor: '#1E1B4B',
    shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  trackerEyebrow: {
    fontSize: 10, fontWeight: '800', color: P.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },
  trackerDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  trackerDotActiveShadow: {
    shadowColor: P.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 5,
  },
  trackerDotText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  trackerLine: {
    flex: 1, height: 2,
    marginTop: 15,
    marginHorizontal: 2,
  },
  trackerLabel: {
    fontSize: 10, fontWeight: '700', textAlign: 'center', width: 56,
  },

  /* ── INFO CARD ── */
  infoCard: {
    backgroundColor: P.surface,
    borderRadius: 14, padding: SPACING.md,
    borderWidth: 1, borderColor: P.border,
    elevation: 2, shadowColor: '#1E1B4B',
    shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
  infoRowIcon: { fontSize: 16, width: 22, textAlign: 'center', marginTop: 1 },
  infoRowBody: { flex: 1 },
  infoRowLabel: {
    fontSize: 10, color: P.textMuted, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
  },
  infoRowValue: { fontSize: 14, color: P.text, fontWeight: '600', lineHeight: 20 },
  infoRowValueHighlight: { color: P.primary },
  infoCardDivider: { height: 1, backgroundColor: P.bg, marginHorizontal: -SPACING.md },

  /* ── SECTIONS ── */
  section: { gap: 10 },
  sectionEyebrow: {
    fontSize: 11, fontWeight: '800', color: P.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  /* ── DESCRIPTION ── */
  descCard: {
    backgroundColor: P.surface,
    borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: P.border,
  },
  descText: { fontSize: 15, color: P.textSub, lineHeight: 23 },

  /* ── SILENT LOADER ── */
  silentLoader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 8,
  },
  silentLoaderText: { fontSize: 13, color: P.textMuted, fontWeight: '500' },

  /* ── START WORK CARD ── */
  startWorkCard: {
    backgroundColor: P.surface,
    borderRadius: 14, padding: SPACING.md,
    borderWidth: 1, borderColor: '#C7D2FE',
    borderLeftWidth: 4, borderLeftColor: P.primary,
    gap: SPACING.md,
  },
  startWorkIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: P.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  startWorkIcon: { fontSize: 16, color: P.primary },
  startWorkBody: { gap: 4 },
  startWorkTitle: { fontSize: 16, fontWeight: '800', color: P.text },
  startWorkDesc: { fontSize: 13, color: P.textSub, lineHeight: 19 },
  startWorkBtn: {
    backgroundColor: P.primary,
    paddingVertical: 14, borderRadius: 12,
    alignItems: 'center',
    shadowColor: P.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  startWorkBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  /* ── PHOTO SECTION ── */
  photoSection: {
    backgroundColor: P.surface,
    borderRadius: 14, padding: SPACING.md,
    borderWidth: 1, borderColor: P.border,
    gap: 12,
  },
  photoSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  photoSectionTitle: { fontSize: 14, fontWeight: '700', color: P.text },
  photoUploadedPill: {
    backgroundColor: P.successLight,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  photoUploadedPillText: { fontSize: 11, fontWeight: '700', color: '#065F46' },

  photoPreviewWrap: { gap: 10 },
  completionImage: {
    width: '100%', height: 180, borderRadius: 10, backgroundColor: P.border,
  },
  replacePhotoBtn: {
    borderWidth: 1.5, borderColor: P.border,
    paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', backgroundColor: P.bg,
  },
  replacePhotoBtnText: { fontSize: 13, fontWeight: '700', color: P.textSub },

  uploadZone: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#C7D2FE',
    borderRadius: 14, backgroundColor: P.primaryLight,
    minHeight: 120, alignItems: 'center', justifyContent: 'center',
    padding: SPACING.lg,
  },
  uploadZoneInner: { alignItems: 'center', gap: 8 },
  uploadZoneIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(79,70,229,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  uploadZoneIcon: { fontSize: 24 },
  uploadZoneTitle: { fontSize: 15, fontWeight: '700', color: P.primary },
  uploadZoneSub: { fontSize: 12, color: '#6366F1', fontWeight: '500' },
  uploadZoneUploading: { fontSize: 13, color: P.primary, fontWeight: '600', marginTop: 8 },

  /* ── BUTTONS ── */
  solidBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  solidBtnIcon: { fontSize: 16 },
  solidBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: P.primary, backgroundColor: P.primaryLight,
  },
  outlineBtnIcon: { fontSize: 16 },
  outlineBtnText: { color: P.primary, fontWeight: '700', fontSize: 14 },

  /* ── COMMENTS ── */
  commentsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentCountBadge: {
    backgroundColor: P.primary, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, minWidth: 24, alignItems: 'center',
  },
  commentCountText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  emptyComments: { alignItems: 'center', paddingVertical: SPACING.lg, gap: 8 },
  emptyCommentsIcon: { fontSize: 30 },
  emptyCommentsText: { color: P.textMuted, fontSize: 14, fontWeight: '500' },

  commentCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: P.surface, borderRadius: 12,
    padding: SPACING.md, borderWidth: 1, borderColor: P.border,
  },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  commentAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  commentAuthor: { fontWeight: '700', color: P.text, fontSize: 13 },
  commentRole: { fontSize: 11, color: P.textMuted, textTransform: 'capitalize' },
  commentText: { fontSize: 14, color: P.textSub, lineHeight: 20, marginBottom: 5 },
  commentDate: { fontSize: 11, color: P.textMuted },

  /* ── COMPOSER ── */
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: P.surface, borderRadius: 12,
    padding: 10, borderWidth: 1, borderColor: P.border,
  },
  composerInput: {
    flex: 1, fontSize: 14, color: P.text,
    maxHeight: 100, minHeight: 44, paddingHorizontal: 4,
  },
  composerSend: {
    backgroundColor: P.primary,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 10, minWidth: 58, alignItems: 'center',
    shadowColor: P.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  composerSendText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  /* ── MODAL ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: P.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '72%', paddingBottom: SPACING.xl,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: P.border, alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: P.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: P.text },
  modalSubtitle: { fontSize: 12, color: P.textMuted, marginTop: 2 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { fontSize: 14, color: P.textSub, fontWeight: '700' },
  modalEmpty: { padding: SPACING.xl, alignItems: 'center', gap: 12 },
  modalEmptyIcon: { fontSize: 40 },
  modalEmptyText: { color: P.textMuted, fontSize: 15, fontWeight: '500', textAlign: 'center' },

  workerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: P.bg,
  },
  workerRowActive: { backgroundColor: P.primaryLight },
  workerAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  workerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  workerName: { fontSize: 15, fontWeight: '700', color: P.text },
  workerEmail: { fontSize: 12, color: P.textSub, marginTop: 2 },
  currentBadge: {
    backgroundColor: P.primaryLight, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#C7D2FE',
  },
  currentBadgeText: { fontSize: 11, color: P.primary, fontWeight: '700' },
});
