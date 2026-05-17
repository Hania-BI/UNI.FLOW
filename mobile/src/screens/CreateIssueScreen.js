import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { apiUploadIssue } from '../api/client';
import { SPACING } from '../theme';

const P = {
  primary:      '#4F46E5',
  primaryDark:  '#3730A3',
  primaryLight: '#EEF2FF',
  bg:           '#F8F9FF',
  surface:      '#FFFFFF',
  text:         '#0F172A',
  textSub:      '#475569',
  textMuted:    '#94A3B8',
  border:       '#E2E8F0',
  error:        '#EF4444',
  errorLight:   '#FEF2F2',
  success:      '#10B981',
};

const CATEGORIES = [
  { value: 'electrical', label: 'Electrical', icon: '⚡', color: '#F59E0B' },
  { value: 'plumbing',   label: 'Plumbing',   icon: '🔧', color: '#3B82F6' },
  { value: 'cleaning',   label: 'Cleaning',   icon: '🧹', color: '#10B981' },
  { value: 'furniture',  label: 'Furniture',  icon: '🪑', color: '#8B5CF6' },
  { value: 'other',      label: 'Other',      icon: '📌', color: '#6B7280' },
];

export default function CreateIssueScreen({ navigation }) {
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('other');
  const [building,    setBuilding]    = useState('');
  const [floor,       setFloor]       = useState('');
  const [room,        setRoom]        = useState('');
  const [imageUri,    setImageUri]    = useState(null);
  const [submitting,  setSubmitting]  = useState(false);

  async function takePhoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Go to Settings → CampusCare → Camera and allow access.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'], allowsEditing: true, quality: 0.7,
      });
      if (!result.canceled) setImageUri(result.assets[0].uri);
    } catch (err) {
      Alert.alert('Camera error', err.message);
    }
  }

  async function pickPhoto() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Go to Settings → CampusCare → Photos and allow access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, quality: 0.7,
      });
      if (!result.canceled) setImageUri(result.assets[0].uri);
    } catch (err) {
      Alert.alert('Gallery error', err.message);
    }
  }

  async function handleSubmit() {
    if (!description.trim() || !building.trim() || !floor.trim() || !room.trim()) {
      return Alert.alert('Missing info', 'Please fill in all fields.');
    }
    try {
      setSubmitting(true);
      const form = new FormData();
      form.append('description', description.trim());
      form.append('category',    category);
      form.append('building',    building.trim());
      form.append('floor',       floor.trim());
      form.append('room',        room.trim());
      if (imageUri) {
        form.append('photo', { uri: imageUri, name: 'issue.jpg', type: 'image/jpeg' });
      }
      await apiUploadIssue(form);
      Alert.alert('Submitted!', 'Your issue has been reported successfully.', [
        {
          text: 'OK',
          onPress: () => {
            setDescription(''); setBuilding(''); setFloor(''); setRoom('');
            setImageUri(null); setCategory('other');
            navigation.navigate('My Issues');
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCat = CATEGORIES.find((c) => c.value === category);
  const hasLocation = building || floor || room;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── CATEGORY ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <View>
              <Text style={styles.sectionEyebrow}>Required</Text>
              <Text style={styles.sectionTitle}>Select Category</Text>
            </View>
          </View>

          <View style={styles.categoryGrid}>
            {CATEGORIES.map((c) => {
              const active = category === c.value;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  style={[
                    styles.catCard,
                    active && { borderColor: c.color, backgroundColor: c.color + '10' },
                  ]}
                >
                  <View style={[
                    styles.catIconWrap,
                    { backgroundColor: active ? c.color + '20' : '#F1F5F9' },
                  ]}>
                    <Text style={styles.catIcon}>{c.icon}</Text>
                  </View>
                  <Text style={[
                    styles.catLabel,
                    active && { color: c.color, fontWeight: '700' },
                  ]}>
                    {c.label}
                  </Text>
                  {active && (
                    <View style={[styles.catCheck, { backgroundColor: c.color }]}>
                      <Text style={styles.catCheckText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── LOCATION ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <View>
              <Text style={styles.sectionEyebrow}>Required</Text>
              <Text style={styles.sectionTitle}>📍 Location</Text>
            </View>
          </View>

          <View style={styles.locationCard}>
            <View style={styles.locationRow}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>Building</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Block A"
                  placeholderTextColor={P.textMuted}
                  value={building}
                  onChangeText={setBuilding}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginHorizontal: SPACING.sm }]}>
                <Text style={styles.inputLabel}>Floor</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2"
                  placeholderTextColor={P.textMuted}
                  value={floor}
                  onChangeText={setFloor}
                  keyboardType="default"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Room</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 205"
                  placeholderTextColor={P.textMuted}
                  value={room}
                  onChangeText={setRoom}
                />
              </View>
            </View>
          </View>
        </View>

        {/* ── DESCRIPTION ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <View>
              <Text style={styles.sectionEyebrow}>Required</Text>
              <Text style={styles.sectionTitle}>📝 Description</Text>
            </View>
          </View>

          <TextInput
            style={styles.textarea}
            placeholder="Describe the issue in detail — what happened, when, and any relevant context…"
            placeholderTextColor={P.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── PHOTO ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepBadge, styles.stepBadgeOptional]}>
              <Text style={[styles.stepBadgeText, styles.stepBadgeTextOptional]}>4</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View>
                <Text style={styles.sectionEyebrow}>Optional</Text>
                <Text style={styles.sectionTitle}>📷 Photo</Text>
              </View>
              {imageUri && (
                <View style={styles.photoUploadedPill}>
                  <Text style={styles.photoUploadedText}>✓ Added</Text>
                </View>
              )}
            </View>
          </View>

          {imageUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri }} style={styles.preview} />
              <Pressable onPress={() => setImageUri(null)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>✕ Remove</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.uploadZone}>
              <View style={styles.uploadZoneIconWrap}>
                <Text style={styles.uploadZoneIcon}>🖼️</Text>
              </View>
              <Text style={styles.uploadZoneTitle}>No photo selected</Text>
              <Text style={styles.uploadZoneSub}>Add a photo to help describe the issue</Text>
            </View>
          )}

          <View style={styles.photoRow}>
            <Pressable onPress={takePhoto} style={styles.photoBtn}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Take Photo</Text>
            </Pressable>
            <Pressable onPress={pickPhoto} style={styles.photoBtn}>
              <Text style={styles.photoBtnIcon}>🖼️</Text>
              <Text style={styles.photoBtnText}>Choose Photo</Text>
            </Pressable>
          </View>
        </View>

        {/* ── SUMMARY PREVIEW ── */}
        {hasLocation && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>Summary Preview</Text>
            <View style={styles.summaryBody}>
              <View style={[
                styles.summaryCatBadge,
                { backgroundColor: (selectedCat?.color ?? '#6B7280') + '15' },
              ]}>
                <Text style={styles.summaryCatIcon}>{selectedCat?.icon}</Text>
                <Text style={[styles.summaryCatText, { color: selectedCat?.color ?? '#6B7280' }]}>
                  {selectedCat?.label}
                </Text>
              </View>
              <Text style={styles.summaryLocation}>
                {building ? `📍 ${building}` : ''}
                {floor   ? ` · Floor ${floor}` : ''}
                {room    ? ` · Room ${room}`   : ''}
              </Text>
            </View>
          </View>
        )}

        {/* ── SUBMIT ── */}
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.submitBtnInner}>
              <Text style={styles.submitBtnText}>Submit Issue</Text>
              <Text style={styles.submitBtnArrow}>→</Text>
            </View>
          )}
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  inner:     { padding: SPACING.lg, paddingBottom: 48, gap: 4 },

  /* ── SECTION HEADERS ── */
  section:       { gap: 12, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: P.primary,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2, flexShrink: 0,
  },
  stepBadgeOptional: { backgroundColor: P.border },
  stepBadgeText:         { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepBadgeTextOptional: { color: P.textMuted },
  sectionEyebrow: {
    fontSize: 10, fontWeight: '700', color: P.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: P.text },

  /* ── CATEGORIES ── */
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  catCard: {
    width: '18%',
    minWidth: 62,
    aspectRatio: 0.88,
    borderWidth: 1.5,
    borderColor: P.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.surface,
    paddingVertical: SPACING.sm,
    gap: 6,
    elevation: 1,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  catIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  catIcon:  { fontSize: 20 },
  catLabel: { fontSize: 10, color: P.textSub, fontWeight: '600', textAlign: 'center' },
  catCheck: {
    position: 'absolute', top: 5, right: 5,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  catCheckText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  /* ── LOCATION ── */
  locationCard: {
    backgroundColor: P.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.border,
    padding: SPACING.md,
    elevation: 2,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  locationRow: { flexDirection: 'row' },
  inputGroup:  {},
  inputLabel: {
    fontSize: 11, fontWeight: '700', color: P.textMuted,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: P.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: P.text,
    backgroundColor: P.bg,
    fontWeight: '500',
  },

  /* ── DESCRIPTION ── */
  textarea: {
    borderWidth: 1.5,
    borderColor: P.border,
    borderRadius: 14,
    padding: SPACING.md,
    fontSize: 14,
    color: P.text,
    backgroundColor: P.surface,
    minHeight: 110,
    lineHeight: 22,
    elevation: 1,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },

  /* ── PHOTO ── */
  photoUploadedPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#6EE7B7',
  },
  photoUploadedText: { color: '#065F46', fontSize: 11, fontWeight: '700' },

  uploadZone: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#C7D2FE',
    borderRadius: 14, backgroundColor: P.primaryLight,
    minHeight: 110, alignItems: 'center', justifyContent: 'center',
    padding: SPACING.lg, gap: 6,
  },
  uploadZoneIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(79,70,229,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  uploadZoneIcon:  { fontSize: 24 },
  uploadZoneTitle: { fontSize: 14, fontWeight: '700', color: P.primary },
  uploadZoneSub:   { fontSize: 12, color: P.textMuted, textAlign: 'center' },

  previewWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: P.border,
    elevation: 2,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  preview: { width: '100%', height: 200 },
  removeBtn: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  removeBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  photoRow: { flexDirection: 'row', gap: SPACING.sm },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: P.primary,
    backgroundColor: P.primaryLight,
  },
  photoBtnIcon: { fontSize: 16 },
  photoBtnText: { color: P.primary, fontWeight: '700', fontSize: 13 },

  /* ── SUMMARY PREVIEW ── */
  summaryCard: {
    backgroundColor: P.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: '#C7D2FE',
    borderLeftWidth: 4, borderLeftColor: P.primary,
    padding: SPACING.md,
    elevation: 1,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  summaryEyebrow: {
    fontSize: 10, fontWeight: '800', color: P.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  summaryBody: { gap: 8 },
  summaryCatBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, alignSelf: 'flex-start',
  },
  summaryCatIcon: { fontSize: 14 },
  summaryCatText: { fontSize: 13, fontWeight: '700' },
  summaryLocation: { fontSize: 13, color: P.textSub, fontWeight: '500', lineHeight: 18 },

  /* ── SUBMIT ── */
  submitBtn: {
    backgroundColor: P.primary,
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: SPACING.sm,
    elevation: 4,
    shadowColor: P.primaryDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  submitBtnInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  submitBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  submitBtnArrow: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
