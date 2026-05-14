import { useState, useRef } from 'react';
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

import { useAuth } from '../auth/AuthContext';
import { COLORS, SPACING, RADIUS } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passwordRef = useRef();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter email and password.');
      return;
    }
    try {
      setSubmitting(true);
      console.log('[LoginScreen] submitting login for:', email.trim());
      await login(email.trim(), password);
      console.log('[LoginScreen] login complete — navigation will update automatically');
    } catch (err) {
      console.error('[LoginScreen] login error:', err.message);
      Alert.alert('Login failed', err.message);
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
          <View style={styles.header}>
            <Text style={styles.title}>CampusCare</Text>
            <Text style={styles.subtitle}>Smart Facility Management System</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@giu.edu"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current.focus()}
              blurOnSubmit={false}
            />

            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>Forgot?</Text>
              </Pressable>
            </View>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />

            <Pressable
              onPress={handleLogin}
              disabled={submitting}
              style={[styles.primaryButton, submitting && styles.disabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Log in</Text>
              )}
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Signup')} style={styles.linkRow}>
              <Text style={styles.linkMuted}>Don't have an account? </Text>
              <Text style={styles.link}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, padding: SPACING.xl, justifyContent: 'center' },
  header: { marginBottom: SPACING.xl },
  title: { fontSize: 36, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary },
  form: { marginTop: SPACING.lg },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs, marginLeft: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forgotText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  linkMuted: { color: COLORS.textSecondary },
  link: { color: COLORS.primary, fontWeight: '600' },
});
