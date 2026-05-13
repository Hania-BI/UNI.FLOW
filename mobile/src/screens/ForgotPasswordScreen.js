import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { apiPost } from '../api/client';
import { COLORS, SPACING, RADIUS } from '../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleReset() {
    if (!email) {
      Alert.alert('Missing info', 'Please enter your email address.');
      return;
    }
    try {
      setSubmitting(true);
      await apiPost('/auth/forgot-password', { email: email.trim() });
      Alert.alert(
        'Email Sent',
        'If an account exists with this email, you will receive a reset link shortly.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Login</Text>
        </Pressable>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your university email and we'll send you a link to reset your password.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="name@giu.edu"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="done"
            onSubmitEditing={handleReset}
          />

          <Pressable
            onPress={handleReset}
            disabled={submitting}
            style={[styles.primaryButton, submitting && styles.disabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Reset Link</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, padding: SPACING.xl, justifyContent: 'center' },
  backButton: { marginBottom: SPACING.xl },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 24, marginBottom: SPACING.xl },
  form: { marginTop: SPACING.md },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs, marginLeft: 4 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
