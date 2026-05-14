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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';

import { apiPost } from '../api/client';
import { COLORS, SPACING, RADIUS } from '../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email) {
      Alert.alert('Missing info', 'Please enter your email address.');
      return;
    }
    try {
      setSubmitting(true);
      await apiPost('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back to Login</Text>
          </Pressable>

          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🔑</Text>
          </View>

          {sent ? (
            <View style={styles.successBlock}>
              <Text style={styles.successIcon}>📬</Text>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successMsg}>
                If an account exists for <Text style={{ fontWeight: '700' }}>{email}</Text>, you'll
                receive a reset link shortly.
              </Text>
              <Pressable onPress={() => navigation.navigate('Login')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Back to Login</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter your university email and we'll send you a link to reset your password.
              </Text>

              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@university.edu"
                  placeholderTextColor={COLORS.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
              </View>

              <Pressable
                onPress={handleReset}
                disabled={submitting}
                style={[styles.primaryButton, submitting && styles.disabled]}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryButtonText}>Send Reset Link</Text>}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, padding: SPACING.xl, justifyContent: 'center' },

  backBtn: { position: 'absolute', top: 56, left: SPACING.xl },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },

  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: SPACING.lg,
  },
  icon: { fontSize: 34 },

  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, textAlign: 'center', marginBottom: SPACING.xl },

  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  inputIcon: { fontSize: 16, marginRight: SPACING.sm },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text },

  primaryButton: {
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
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },

  successBlock: { alignItems: 'center' },
  successIcon: { fontSize: 56, marginBottom: SPACING.md },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  successMsg: {
    fontSize: 14, color: COLORS.textSecondary, lineHeight: 22,
    textAlign: 'center', marginBottom: SPACING.xl,
  },
});
