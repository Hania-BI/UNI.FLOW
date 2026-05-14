import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard, Animated, StatusBar,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';

const T = {
  bg: '#F8F9FF', primary: '#4F46E5', primaryDark: '#3730A3',
  primaryLight: '#EEF2FF', surface: '#FFFFFF',
  text: '#0F172A', textSub: '#475569', textMuted: '#94A3B8',
  border: '#E2E8F0', borderFocus: '#4F46E5',
  error: '#EF4444', errorLight: '#FEF2F2',
};

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [focused, setFocused]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const passwordRef = useRef();
  const btnScale    = useRef(new Animated.Value(1)).current;

  // Entrance animation
  const slideY  = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideY,  { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  function pressIn()  { Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start(); }

  async function handleLogin() {
    setInlineError('');
    if (!email.trim()) { setInlineError('Email is required.'); return; }
    if (!password)     { setInlineError('Password is required.'); return; }
    try {
      setSubmitting(true);
      await login(email.trim(), password);
    } catch (err) {
      setInlineError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar barStyle="light-content" backgroundColor={T.primary} />

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🏛️</Text>
          </View>
          <Text style={styles.heroTitle}>CampusCare</Text>
          <Text style={styles.heroSub}>Smart Facility Management</Text>
        </View>

        {/* Card */}
        <Animated.View style={[styles.card, { transform: [{ translateY: slideY }], opacity }]}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to your account to continue</Text>

          {/* Inline error */}
          {!!inlineError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxIcon}>⚠️</Text>
              <Text style={styles.errorBoxText}>{inlineError}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email address</Text>
            <View style={[styles.inputWrap, focused === 'email' && styles.inputWrapFocus]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="you@university.edu"
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
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Password</Text>
              <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </Pressable>
            </View>
            <View style={[styles.inputWrap, focused === 'password' && styles.inputWrapFocus]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Your password"
                placeholderTextColor={T.textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); setInlineError(''); }}
                secureTextEntry={!showPass}
                returnKeyType="go"
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Submit */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              onPress={handleLogin}
              onPressIn={pressIn}
              onPressOut={pressOut}
              disabled={submitting}
              style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Sign In  →</Text>}
            </Pressable>
          </Animated.View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign up */}
          <Pressable onPress={() => navigation.navigate('Signup')} style={styles.outlineBtn}>
            <Text style={styles.outlineBtnText}>Create an Account</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.primary },

  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 16 },
  logoCircle: {
    width: 84, height: 84, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoIcon:  { fontSize: 42 },
  heroTitle: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  heroSub:   { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  card: {
    backgroundColor: T.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 28, paddingTop: 28, paddingBottom: 36,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: T.text, marginBottom: 4 },
  cardSub:   { fontSize: 14, color: T.textSub, marginBottom: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: T.errorLight, borderRadius: 10, borderWidth: 1,
    borderColor: '#FECACA', padding: 12, marginBottom: 16,
  },
  errorBoxIcon: { fontSize: 14, marginTop: 1 },
  errorBoxText: { flex: 1, fontSize: 13, color: T.error, lineHeight: 18 },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: T.text, marginBottom: 7 },
  labelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  forgotLink: { fontSize: 13, color: T.primary, fontWeight: '600' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: 12,
    borderWidth: 1.5, borderColor: T.border,
    paddingHorizontal: 14,
  },
  inputWrapFocus: { borderColor: T.borderFocus, backgroundColor: '#FAFBFF' },
  inputIcon:  { fontSize: 16, marginRight: 10 },
  input:      { flex: 1, paddingVertical: 14, fontSize: 15, color: T.text },
  eyeIcon:    { fontSize: 16, padding: 4 },

  primaryBtn: {
    backgroundColor: T.primary, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', marginTop: 4,
    shadowColor: T.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled:    { opacity: 0.65 },

  divider: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 20, gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: T.border },
  dividerText: { fontSize: 13, color: T.textMuted },

  outlineBtn: {
    borderWidth: 1.5, borderColor: T.primary,
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  outlineBtnText: { color: T.primary, fontSize: 15, fontWeight: '700' },
});
