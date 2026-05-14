import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { COLORS, SPACING, RADIUS } from '../theme';

const ROLES = [
  { label: 'Community Member', value: 'community_member', icon: '🎓', desc: 'Report campus issues' },
  { label: 'Facility Manager', value: 'facility_manager', icon: '🏢', desc: 'Oversee & assign work' },
  { label: 'Worker', value: 'worker', icon: '🛠️', desc: 'Complete assigned tasks' },
];

export default function SignupScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('community_member');
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef();
  const passwordRef = useRef();

  async function handleSignup() {
    if (!name || !email || !password) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    try {
      setSubmitting(true);
      await register(name.trim(), email.trim(), password, role);
      Alert.alert('Account created!', 'Please log in with your new account.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      Alert.alert('Signup failed', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back + title */}
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join CampusCare to keep the campus running smoothly.</Text>
          </View>

          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Alice Smith"
                placeholderTextColor={COLORS.textSecondary}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>University Email</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="alice@university.edu"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={COLORS.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                {[1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          password.length >= i * 3
                            ? password.length < 8 ? '#FF9800' : COLORS.success
                            : COLORS.border,
                      },
                    ]}
                  />
                ))}
                <Text style={styles.strengthLabel}>
                  {password.length < 5 ? 'Weak' : password.length < 8 ? 'Almost' : 'Strong'}
                </Text>
              </View>
            )}
          </View>

          {/* Role picker */}
          <Text style={styles.label}>I am a…</Text>
          <View style={styles.roleGrid}>
            {ROLES.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setRole(r.value)}
                style={[styles.roleCard, role === r.value && styles.roleCardActive]}
              >
                <Text style={styles.roleIcon}>{r.icon}</Text>
                <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>
                  {r.label}
                </Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleSignup}
            disabled={submitting}
            style={[styles.primaryButton, submitting && styles.disabled]}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryButtonText}>Create Account</Text>}
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkMuted}>Already have an account? </Text>
            <Text style={styles.link}>Sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { padding: SPACING.xl, paddingTop: 60, paddingBottom: 48 },

  backBtn: { marginBottom: SPACING.lg },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },

  titleBlock: { marginBottom: SPACING.xl },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },

  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: { fontSize: 16, marginRight: SPACING.sm },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 16 },

  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, color: COLORS.textSecondary, marginLeft: 4, width: 40 },

  roleGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
    marginTop: SPACING.sm,
  },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  roleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#E6F0FA',
  },
  roleIcon: { fontSize: 22, marginBottom: 6 },
  roleLabel: {
    fontSize: 10, fontWeight: '700',
    color: COLORS.textSecondary, textAlign: 'center', marginBottom: 4,
  },
  roleLabelActive: { color: COLORS.primary },
  roleDesc: { fontSize: 9, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 13 },

  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },

  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  linkMuted: { color: COLORS.textSecondary },
  link: { color: COLORS.primary, fontWeight: '600' },
});
