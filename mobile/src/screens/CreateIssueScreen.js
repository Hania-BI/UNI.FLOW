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

export default function CreateIssueScreen({ navigation }) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
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
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
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
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Gallery error', err.message);
    }
  }

  async function handleSubmit() {
    if (!description || !building || !floor || !room) {
      return Alert.alert('Missing info', 'Please fill in all fields.');
    }

    try {
      setSubmitting(true);
      const form = new FormData();
      form.append('description', description);
      form.append('category', category.toLowerCase());
      form.append('building', building);
      form.append('floor', floor);
      form.append('room', room);

      if (imageUri) {
        form.append('photo', {
          uri: imageUri,
          name: 'issue.jpg',
          type: 'image/jpeg',
        });
      }

      await apiUploadIssue(form);
      Alert.alert('Success', 'Issue reported successfully!');
      navigation.navigate('My Issues');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const categories = ['Electrical', 'Plumbing', 'Cleaning', 'Furniture', 'Other'];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.label}>Category</Text>
        <View style={styles.categories}>
          {categories.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.catButton, category === c && styles.catButtonActive]}
            >
              <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Location</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Building"
            value={building}
            onChangeText={setBuilding}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginHorizontal: 8 }]}
            placeholder="Floor"
            value={floor}
            onChangeText={setFloor}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Room"
            value={room}
            onChangeText={setRoom}
          />
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe the issue..."
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* Photo section */}
        <Text style={styles.label}>Photo (optional)</Text>

        {imageUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <Pressable onPress={() => setImageUri(null)} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>✕ Remove</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.photoButtons}>
          <Pressable onPress={takePhoto} style={styles.photoBtn}>
            <Text style={styles.photoBtnIcon}>📷</Text>
            <Text style={styles.photoBtnText}>Take Photo</Text>
          </Pressable>

          <Pressable onPress={pickPhoto} style={styles.photoBtn}>
            <Text style={styles.photoBtnIcon}>🖼</Text>
            <Text style={styles.photoBtnText}>Upload Photo</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={[styles.primaryButton, submitting && styles.disabled]}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryButtonText}>Submit Issue</Text>}
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, paddingBottom: SPACING.xl * 2 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: SPACING.sm, color: COLORS.text },

  categories: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.lg },
  catButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
  },
  catButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { fontSize: 12, color: COLORS.textSecondary },
  catTextActive: { color: '#fff', fontWeight: 'bold' },

  row: { flexDirection: 'row', marginBottom: SPACING.lg },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    backgroundColor: COLORS.surface,
  },
  textarea: { height: 100, textAlignVertical: 'top', marginBottom: SPACING.lg },

  previewContainer: {
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  preview: { width: '100%', height: 180 },
  removeBtn: {
    backgroundColor: '#00000066',
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  removeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  photoButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  photoBtnIcon: { fontSize: 18 },
  photoBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },

  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
