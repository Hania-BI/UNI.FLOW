import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard, Animated, StatusBar,
} from 'react-native';
import { apiPost } from '../api/client';

const T = {
  bg: '#F8F9FF', primary: '#4F46E5', primaryLight: '#EEF2FF',
  surface: '#FFFFFF', text: '#0F172A', textSub: '#475569',
  textMuted: '#94A3B8', border: '#E2E8F0', borderFocus: '#4F46E5',
  error: '#EF4444', errorLight: '#FEF2F2',
  success: '#10B981', successLight: '#ECFDF5',
  warning: '#F59E0B',
};

function getStrength(p) {
  if (!p) return { level: 0, label: '', color: T.border };
  if (p.length < 5)  return { level: 1, label: 'Too short', color: T.error };
  if (p.length < 8)  return { level: 2, label: 'Weak',      color: T.warning };
  if (p.length < 12) return { level: 3, label: 'Good',      color: T.primary };
  return { level: 4, label: 'Strong', color: T.success };
}

export default function ResetPasswordScreen({ route, navigation }) {
  const { email } = route.params ?? {};

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [success, setSuccess]       = useState(false);

  const confirmRef = useRef();
  const btnScale   = useRef(new Animated.Value(1)).current;
  const slideY     = useRef(new Animated.Value(30)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.5)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideY,  { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  function showSuccessAnimation(cb) {
    Animated.parallel([
      Animated.spring(successScale,   { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => setTimeout(cb, 1500));
  }

  function pressIn()  { Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start(); }

  const strength = getStrength(password);
  const matches  = confirm.length > 0 && password === confirm;
  const mismatch = confirm.length > 0 && password !== confirm;

  async function handleReset() {
    setInlineError('');
    if (password.length < 8) { setInlineError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setInlineError('Passwords do not match.'); return; }
    if (!email)               { setInlineError('Session expired. Please start over.'); return; }
    try {
      setSubmitting(true);
      await apiPost('/auth/reset-password', { email, password });
      setSuccess(true);
      showSuccessAnimation(() => navigation.replace('Login'));
    } catch (err) {
      setInlineError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <View style={styles.successScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
        <Animated.View style={[styles.successWrap, { transform: [{ scale: successScale }], opacity: successOpacity }]}>
          <View style={styles.successIconWrap}>
            <Text style={styles.successIcon}>✅</Text>
          </View>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successSub}>Redirecting you to sign in…</Text>
          <ActivityIndicator color={T.primary} style={{ marginTop: 16 }} />
        </Animated.View>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Animated.View style={[styles.inner, { transform: [{ translateY: slideY }], opacity }]}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🔐</Text>
          </View>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Create a strong new password for{' '}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          {!!inlineError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{inlineError}</Text>
            </View>
          )}

          {/* New password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={[styles.inputWrap, focused === 'pass' && styles.inputWrapFocus]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={T.textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); setInlineError(''); }}
                secureTextEntry={!showPass}
                returnKeyType="next"
                onFocus={() => setFocused('pass')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
              />
              <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                {[1, 2, 3, 4].map(i => (
                  <View key={i} style={[styles.strengthBar, { backgroundColor: strength.level >= i ? strength.color : T.border }]} />
                ))}
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}
          </View>

          {/* Confirm password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[
              styles.inputWrap,
              focused === 'confirm' && styles.inputWrapFocus,
              matches  && styles.inputWrapSuccess,
              mismatch && styles.inputWrapError,
            ]}>
              <Text style={styles.inputIcon}>{matches ? '✅' : mismatch ? '❌' : '🔒'}</Text>
              <TextInput
                ref={confirmRef}
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor={T.textMuted}
                value={confirm}
                onChangeText={(v) => { setConfirm(v); setInlineError(''); }}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onFocus={() => setFocused('confirm')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={handleReset}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
            {mismatch && <Text style={styles.mismatchText}>Passwords do not match</Text>}
            {matches  && <Text style={styles.matchText}>✓ Passwords match</Text>}
          </View>

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              onPress={handleReset}
              onPressIn={pressIn}
              onPressOut={pressOut}
              disabled={submitting}
              style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Reset Password  →</Text>}
            </Pressable>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, paddingHorizontal: 28, paddingTop: 56 },

  backBtn:  { marginBottom: 24 },
  backText: { color: T.primary, fontWeight: '700', fontSize: 15 },
  inner:    {},

  iconWrap: {
    width: 70, height: 70, borderRadius: 22,
    backgroundColor: T.primaryLight, alignItems: 'center',
    justifyContent: 'center', marginBottom: 20, alignSelf: 'flex-start',
  },
  icon:      { fontSize: 34 },
  title:     { fontSize: 26, fontWeight: '800', color: T.text, marginBottom: 8 },
  subtitle:  { fontSize: 14, color: T.textSub, lineHeight: 22, marginBottom: 24 },
  emailText: { fontWeight: '700', color: T.primary },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: T.errorLight, borderRadius: 10, borderWidth: 1,
    borderColor: '#FECACA', padding: 12, marginBottom: 16,
  },
  errorIcon: { fontSize: 14, marginTop: 1 },
  errorText: { flex: 1, fontSize: 13, color: T.error, lineHeight: 18 },

  fieldGroup:      { marginBottom: 16 },
  label:           { fontSize: 13, fontWeight: '600', color: T.text, marginBottom: 7 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: 12,
    borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 14,
  },
  inputWrapFocus:   { borderColor: T.borderFocus },
  inputWrapSuccess: { borderColor: T.success, backgroundColor: T.successLight },
  inputWrapError:   { borderColor: T.error, backgroundColor: T.errorLight },
  inputIcon:        { fontSize: 16, marginRight: 10 },
  input:            { flex: 1, paddingVertical: 14, fontSize: 15, color: T.text },
  eyeIcon:          { fontSize: 16, padding: 4 },

  strengthRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  strengthBar:   { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', width: 55, textAlign: 'right' },

  mismatchText: { fontSize: 12, color: T.error,   marginTop: 5, fontWeight: '600' },
  matchText:    { fontSize: 12, color: T.success, marginTop: 5, fontWeight: '600' },

  primaryBtn: {
    backgroundColor: T.primary, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', marginTop: 8,
    shadowColor: T.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled:    { opacity: 0.65 },

  successScreen: {
    flex: 1, backgroundColor: T.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  successWrap:    { alignItems: 'center' },
  successIconWrap:{
    width: 90, height: 90, borderRadius: 30,
    backgroundColor: T.successLight, alignItems: 'center',
    justifyContent: 'center', marginBottom: 20,
    borderWidth: 2, borderColor: '#6EE7B7',
  },
  successIcon:  { fontSize: 44 },
  successTitle: { fontSize: 24, fontWeight: '800', color: T.text, marginBottom: 8 },
  successSub:   { fontSize: 14, color: T.textSub },
});
