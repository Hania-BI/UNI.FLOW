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
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { COLORS, SPACING, RADIUS } from '../theme';

export default function SignupScreen({ navigation }) {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('community_member');
  const [submitting, setSubmitting] = useState(false);

  // Refs for focusing next input
  const emailRef = useRef();
  const passwordRef = useRef();

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  async function handleSignup() {
    if (!name || !email || !password) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      await register(name.trim(), email.trim(), password, role);
      Alert.alert('Success', 'Account created! Please log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err) {
      Alert.alert('Signup failed', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const roles = [
    { label: 'Community Member', value: 'community_member', icon: '🎓' },
    { label: 'Facility Manager', value: 'facility_manager', icon: '🏢' },
    { label: 'Worker', value: 'worker', icon: '🛠️' },
  ];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.inner} style={styles.container}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join CampusCare to report and manage issues.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Alice Smith"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current.focus()}
              blurOnSubmit={false}
            />

            <Text style={styles.label}>University Email</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              placeholder="alice@giu.edu"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current.focus()}
              blurOnSubmit={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignup}
            />

            <Text style={styles.label}>Select Your Role</Text>
            <View style={styles.roleGrid}>
              {roles.map((r) => (
                <Pressable
                  key={r.value}
                  onPress={() => setRole(r.value)}
                  style={[
                    styles.roleCard,
                    role === r.value && styles.roleCardActive
                  ]}
                >
                  <Text style={styles.roleIcon}>{r.icon}</Text>
                  <Text style={[
                    styles.roleLabel,
                    role === r.value && styles.roleLabelActive
                  ]}>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleSignup}
              disabled={submitting}
              style={[styles.primaryButton, submitting && styles.disabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign Up</Text>
              )}
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
              <Text style={styles.linkMuted}>Already have an account? </Text>
              <Text style={styles.link}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { padding: SPACING.xl, paddingTop: 80, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary, marginBottom: SPACING.xs },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: SPACING.xl },
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
  roleGrid: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: SPACING.xl,
    marginTop: SPACING.xs
  },
  roleCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 4,
  },
  roleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#E6F0FA',
    borderWidth: 2,
  },
  roleIcon: { fontSize: 20, marginBottom: 4 },
  roleLabel: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '500' },
  roleLabelActive: { color: COLORS.primary, fontWeight: 'bold' },
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
