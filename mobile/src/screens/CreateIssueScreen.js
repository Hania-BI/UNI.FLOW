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
import { COLORS, SPACING, RADIUS } from '../theme';

const CATEGORIES = [
  { value: 'electrical', label: 'Electrical', icon: '⚡' },
  { value: 'plumbing', label: 'Plumbing', icon: '🔧' },
  { value: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { value: 'furniture', label: 'Furniture', icon: '🪑' },
  { value: 'other', label: 'Other', icon: '📌' },
];

export default function CreateIssueScreen({ navigation }) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
      form.append('category', category);
      form.append('building', building.trim());
      form.append('floor', floor.trim());
      form.append('room', room.trim());
      if (imageUri) {
        form.append('photo', { uri: imageUri, name: 'issue.jpg', type: 'image/jpeg' });
      }
      await apiUploadIssue(form);
      Alert.alert('Submitted!', 'Your issue has been reported successfully.', [
        { text: 'OK', onPress: () => {
          setDescription(''); setBuilding(''); setFloor(''); setRoom('');
          setImageUri(null); setCategory('other');
          navigation.navigate('My Issues');
        }},
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCat = CATEGORIES.find((c) => c.value === category);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Category */}
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => setCategory(c.value)}
              style={[styles.catCard, category === c.value && styles.catCardActive]}
            >
              <Text style={styles.catIcon}>{c.icon}</Text>
              <Text style={[styles.catLabel, category === c.value && styles.catLabelActive]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Location */}
        <Text style={styles.sectionTitle}>📍 Location</Text>
        <View style={styles.locationCard}>
          <View style={styles.locationRow}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.inputLabel}>Building</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Block A"
                value={building}
                onChangeText={setBuilding}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginHorizontal: SPACING.sm }]}>
              <Text style={styles.inputLabel}>Floor</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2"
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
                value={room}
                onChangeText={setRoom}
              />
            </View>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>📝 Description</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Describe the issue in detail…"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Photo */}
        <Text style={styles.sectionTitle}>📷 Photo <Text style={styles.optional}>(optional)</Text></Text>

        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <Pressable onPress={() => setImageUri(null)} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>✕ Remove</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderIcon}>🖼️</Text>
            <Text style={styles.photoPlaceholderText}>No photo selected</Text>
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

        {/* Summary preview */}
        {(building || floor || room) && (
          <View style={styles.previewSummary}>
            <Text style={styles.previewSummaryTitle}>Summary</Text>
            <Text style={styles.previewSummaryText}>
              {selectedCat?.icon} {selectedCat?.label} issue
              {building ? ` at ${building}` : ''}
              {floor ? `, Floor ${floor}` : ''}
              {room ? `, Room ${room}` : ''}
            </Text>
          </View>
        )}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={[styles.submitBtn, submitting && styles.disabled]}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : (
              <View style={styles.submitBtnInner}>
                <Text style={styles.submitBtnText}>Submit Issue</Text>
                <Text style={styles.submitBtnIcon}>→</Text>
              </View>
            )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { padding: SPACING.lg, paddingBottom: 48 },

  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.text,
    marginBottom: SPACING.sm, marginTop: SPACING.md,
  },
  optional: { fontSize: 13, fontWeight: '400', color: COLORS.textSecondary },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  catCard: {
    width: '18%',
    minWidth: 62,
    aspectRatio: 0.9,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
  },
  catCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#E6F0FA',
  },
  catIcon: { fontSize: 22, marginBottom: 5 },
  catLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' },
  catLabelActive: { color: COLORS.primary },

  locationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  locationRow: { flexDirection: 'row' },
  inputGroup: {},
  inputLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },

  textarea: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    minHeight: 100,
    marginBottom: SPACING.sm,
  },

  previewWrap: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  preview: { width: '100%', height: 180 },
  removeBtn: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    backgroundColor: '#00000077',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  removeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  photoPlaceholder: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  photoPlaceholderIcon: { fontSize: 32, marginBottom: SPACING.xs },
  photoPlaceholderText: { fontSize: 13, color: COLORS.textSecondary },

  photoRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  photoBtnIcon: { fontSize: 17 },
  photoBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },

  previewSummary: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  previewSummaryTitle: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginBottom: 3, textTransform: 'uppercase' },
  previewSummaryText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },

  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  submitBtnIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
