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

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need gallery access to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function handleSubmit() {
    if (!description || !building || !floor || !room) {
      return Alert.alert('Missing info', 'Please fill in all fields.');
    }

    try {
      setSubmitting(true);
      const form = new FormData();
      form.append('description', description);
      form.append('category', category);
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
          <TextInput style={[styles.input, { flex: 2 }]} placeholder="Building" value={building} onChangeText={setBuilding} />
          <TextInput style={[styles.input, { flex: 1, marginHorizontal: 8 }]} placeholder="Floor" value={floor} onChangeText={setFloor} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Room" value={room} onChangeText={setRoom} />
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe the issue..."
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Pressable onPress={pickPhoto} style={styles.imagePicker}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} />
          ) : (
            <Text style={styles.imagePickerText}>📸 Add Photo</Text>
          )}
        </Pressable>

        <Pressable onPress={handleSubmit} disabled={submitting} style={[styles.primaryButton, submitting && styles.disabled]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Submit Issue</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.lg },
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
  imagePicker: {
    height: 150,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  imagePickerText: { color: COLORS.primary, fontWeight: '600' },
  preview: { width: '100%', height: '100%' },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
