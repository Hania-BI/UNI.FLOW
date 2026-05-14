import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView,
  Platform, TouchableWithoutFeedback, Keyboard, Animated, StatusBar,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';

const T = {
  bg: '#F8F9FF', primary: '#4F46E5', primaryLight: '#EEF2FF',
  surface: '#FFFFFF', text: '#0F172A', textSub: '#475569',
  textMuted: '#94A3B8', border: '#E2E8F0', borderFocus: '#4F46E5',
  error: '#EF4444', errorLight: '#FEF2F2',
  success: '#10B981', warning: '#F59E0B',
};

const ROLES = [
  { value: 'community_member', label: 'Community Member', icon: '🎓', desc: 'Report campus issues' },
  { value: 'facility_manager', label: 'Facility Manager', icon: '🏢', desc: 'Oversee & assign work' },
  { value: 'worker',           label: 'Worker',           icon: '🛠️', desc: 'Complete assigned tasks' },
];

function getStrength(p) {
  if (!p) return { level: 0, label: '', color: T.border };
  if (p.length < 5)  return { level: 1, label: 'Too short', color: T.error };
  if (p.length < 8)  return { level: 2, label: 'Weak',      color: T.warning };
  if (p.length < 12) return { level: 3, label: 'Good',      color: T.primary };
  return { level: 4, label: 'Strong', color: T.success };
}

export default function SignupScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole]       = useState('community_member');
  const [focused, setFocused] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const emailRef    = useRef();
  const passwordRef = useRef();
  const btnScale    = useRef(new Animated.Value(1)).current;

  const slideY  = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideY,  { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  function pressIn()  { Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start(); }

  const strength = getStrength(password);

  async function handleSignup() {
    setInlineError('');
    if (!name.trim())  { setInlineError('Full name is required.'); return; }
    if (!email.trim()) { setInlineError('Email is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setInlineError('Please enter a valid email address.'); return;
    }
    if (password.length < 8) {
      setInlineError('Password must be at least 8 characters.'); return;
    }
    try {
      setSubmitting(true);
      await register(name.trim(), email.trim(), password, role);
      navigation.navigate('Login');
    } catch (err) {
      setInlineError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          {/* Header */}
          <Animated.View style={[styles.header, { transform: [{ translateY: slideY }], opacity }]}>
            <View style={styles.headerIcon}><Text style={{ fontSize: 30 }}>👋</Text></View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join CampusCare to keep the campus running.</Text>
          </Animated.View>

          <Animated.View style={{ transform: [{ translateY: slideY }], opacity }}>

            {/* Error */}
            {!!inlineError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{inlineError}</Text>
              </View>
            )}

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={[styles.inputWrap, focused === 'name' && styles.inputWrapFocus]}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Alice Smith"
                  placeholderTextColor={T.textMuted}
                  value={name}
                  onChangeText={(v) => { setName(v); setInlineError(''); }}
                  returnKeyType="next"
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>University Email</Text>
              <View style={[styles.inputWrap, focused === 'email' && styles.inputWrapFocus]}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="alice@university.edu"
                  placeholderTextColor={T.textMuted}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setInlineError(''); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, focused === 'password' && styles.inputWrapFocus]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="At least 8 characters"
                  placeholderTextColor={T.textMuted}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setInlineError(''); }}
                  secureTextEntry={!showPass}
                  returnKeyType="done"
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={handleSignup}
                />
                <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                  <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
              {/* Strength meter */}
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  {[1, 2, 3, 4].map(i => (
                    <View
                      key={i}
                      style={[styles.strengthBar, { backgroundColor: strength.level >= i ? strength.color : T.border }]}
                    />
                  ))}
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                </View>
              )}
            </View>

            {/* Role picker */}
            <Text style={styles.label}>I am a…</Text>
            <View style={styles.roleGrid}>
              {ROLES.map(r => (
                <Pressable
                  key={r.value}
                  onPress={() => setRole(r.value)}
                  style={[styles.roleCard, role === r.value && styles.roleCardActive]}
                >
                  <Text style={styles.roleIcon}>{r.icon}</Text>
                  <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>{r.label}</Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                  {role === r.value && <View style={styles.roleCheck}><Text style={styles.roleCheckText}>✓</Text></View>}
                </Pressable>
              ))}
            </View>

            {/* Submit */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable
                onPress={handleSignup}
                onPressIn={pressIn}
                onPressOut={pressOut}
                disabled={submitting}
                style={[styles.primaryBtn, submitting && styles.btnDisabled]}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Create Account  →</Text>}
              </Pressable>
            </Animated.View>

            <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
              <Text style={styles.linkMuted}>Already have an account? </Text>
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  inner: { padding: 28, paddingTop: 56, paddingBottom: 48, backgroundColor: T.bg },

  backBtn:  { marginBottom: 20 },
  backText: { color: T.primary, fontWeight: '700', fontSize: 15 },

  header:     { alignItems: 'flex-start', marginBottom: 24 },
  headerIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: T.primaryLight, alignItems: 'center',
    justifyContent: 'center', marginBottom: 14,
  },
  title:    { fontSize: 26, fontWeight: '800', color: T.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: T.textSub, lineHeight: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: T.errorLight, borderRadius: 10, borderWidth: 1,
    borderColor: '#FECACA', padding: 12, marginBottom: 16,
  },
  errorIcon: { fontSize: 14, marginTop: 1 },
  errorText: { flex: 1, fontSize: 13, color: T.error, lineHeight: 18 },

  fieldGroup:     { marginBottom: 16 },
  label:          { fontSize: 13, fontWeight: '600', color: T.text, marginBottom: 7 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: 12,
    borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 14,
  },
  inputWrapFocus: { borderColor: T.borderFocus },
  inputIcon:      { fontSize: 16, marginRight: 10 },
  input:          { flex: 1, paddingVertical: 14, fontSize: 15, color: T.text },
  eyeIcon:        { fontSize: 16, padding: 4 },

  strengthRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  strengthBar:  { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel:{ fontSize: 11, fontWeight: '700', width: 55, textAlign: 'right' },

  roleGrid: { flexDirection: 'row', gap: 8, marginBottom: 24, marginTop: 8 },
  roleCard: {
    flex: 1, alignItems: 'center', padding: 12,
    borderRadius: 14, borderWidth: 1.5, borderColor: T.border,
    backgroundColor: T.surface, position: 'relative',
  },
  roleCardActive: { borderColor: T.primary, backgroundColor: T.primaryLight },
  roleIcon:  { fontSize: 22, marginBottom: 6 },
  roleLabel: { fontSize: 10, fontWeight: '700', color: T.textSub, textAlign: 'center', marginBottom: 4 },
  roleLabelActive: { color: T.primary },
  roleDesc:  { fontSize: 9, color: T.textMuted, textAlign: 'center', lineHeight: 13 },
  roleCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center',
  },
  roleCheckText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  primaryBtn: {
    backgroundColor: T.primary, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', marginTop: 4,
    shadowColor: T.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled:    { opacity: 0.65 },

  linkRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  linkMuted:{ color: T.textSub },
  link:     { color: T.primary, fontWeight: '700' },
});
