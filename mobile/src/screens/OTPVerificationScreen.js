import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Animated, StatusBar,
} from 'react-native';
import { apiPost } from '../api/client';

const T = {
  bg: '#F8F9FF', primary: '#4F46E5', primaryLight: '#EEF2FF',
  primaryDark: '#3730A3', surface: '#FFFFFF',
  text: '#0F172A', textSub: '#475569', textMuted: '#94A3B8',
  border: '#E2E8F0', borderFocus: '#4F46E5',
  error: '#EF4444', errorLight: '#FEF2F2',
  success: '#10B981', successLight: '#ECFDF5',
};

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OTPVerificationScreen({ route, navigation }) {
  const { email } = route.params ?? {};

  const [otp, setOtp]           = useState(Array(OTP_LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [countdown, setCountdown]   = useState(RESEND_SECONDS);
  const [resending, setResending]   = useState(false);

  const inputs  = useRef([]);
  const btnScale = useRef(new Animated.Value(1)).current;
  const slideY   = useRef(new Animated.Value(30)).current;
  const opacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideY,  { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    // Auto focus first input
    setTimeout(() => inputs.current[0]?.focus(), 500);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  function pressIn()  { Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start(); }

  function handleChange(text, index) {
    setInlineError('');
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next  = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
    // Auto-submit when all filled
    if (digit && next.every(d => d !== '')) {
      submitOtp(next.join(''));
    }
  }

  function handleKeyPress(e, index) {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
    }
  }

  async function submitOtp(code) {
    const token = code ?? otp.join('');
    if (token.length < OTP_LENGTH) {
      setInlineError('Please enter the complete 6-digit code.'); return;
    }
    try {
      setSubmitting(true);
      const data = await apiPost('/auth/verify-otp', { email, token });
      navigation.navigate('ResetPassword', { resetToken: data.token, email });
    } catch (err) {
      setInlineError(err.message);
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    try {
      setResending(true);
      setInlineError('');
      await apiPost('/auth/forgot-password', { email });
      setCountdown(RESEND_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } catch (err) {
      setInlineError(err.message);
    } finally {
      setResending(false);
    }
  }

  const filled = otp.filter(d => d !== '').length;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Animated.View style={[styles.inner, { transform: [{ translateY: slideY }], opacity }]}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>📬</Text>
        </View>

        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit verification code to
        </Text>
        <Text style={styles.emailBadge}>{email}</Text>

        {/* Error */}
        {!!inlineError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{inlineError}</Text>
          </View>
        )}

        {/* OTP inputs */}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={r => { inputs.current[i] = r; }}
              style={[
                styles.otpBox,
                digit && styles.otpBoxFilled,
                inlineError && styles.otpBoxError,
              ]}
              value={digit}
              onChangeText={t => handleChange(t, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
              editable={!submitting}
            />
          ))}
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: `${(filled / OTP_LENGTH) * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{filled}/{OTP_LENGTH} digits entered</Text>

        {/* Verify button */}
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            onPress={() => submitOtp()}
            onPressIn={pressIn}
            onPressOut={pressOut}
            disabled={submitting || filled < OTP_LENGTH}
            style={[styles.primaryBtn, (submitting || filled < OTP_LENGTH) && styles.btnDisabled]}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Verify Code  →</Text>}
          </Pressable>
        </Animated.View>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive the code? </Text>
          {countdown > 0 ? (
            <Text style={styles.resendTimer}>Resend in {countdown}s</Text>
          ) : (
            <Pressable onPress={resendCode} disabled={resending}>
              {resending
                ? <ActivityIndicator size="small" color={T.primary} />
                : <Text style={styles.resendLink}>Resend Code</Text>}
            </Pressable>
          )}
        </View>

        <View style={styles.hintBox}>
          <Text style={styles.hintText}>💡 Check your spam folder if you don't see the email.</Text>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, paddingHorizontal: 28, paddingTop: 56 },

  backBtn:  { marginBottom: 24 },
  backText: { color: T.primary, fontWeight: '700', fontSize: 15 },

  inner: {},

  iconWrap: {
    width: 70, height: 70, borderRadius: 22,
    backgroundColor: T.primaryLight, alignItems: 'center',
    justifyContent: 'center', marginBottom: 20, alignSelf: 'flex-start',
  },
  icon:    { fontSize: 34 },
  title:   { fontSize: 26, fontWeight: '800', color: T.text, marginBottom: 8 },
  subtitle:{ fontSize: 14, color: T.textSub, marginBottom: 4 },
  emailBadge: {
    fontSize: 14, fontWeight: '700', color: T.primary,
    backgroundColor: T.primaryLight, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 24,
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: T.errorLight, borderRadius: 10, borderWidth: 1,
    borderColor: '#FECACA', padding: 12, marginBottom: 16,
  },
  errorIcon: { fontSize: 14, marginTop: 1 },
  errorText: { flex: 1, fontSize: 13, color: T.error, lineHeight: 18 },

  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpBox: {
    width: 48, height: 58,
    borderWidth: 2, borderColor: T.border,
    borderRadius: 14, fontSize: 24, fontWeight: '800',
    color: T.text, backgroundColor: T.surface,
    textAlign: 'center',
  },
  otpBoxFilled: { borderColor: T.primary, backgroundColor: T.primaryLight, color: T.primary },
  otpBoxError:  { borderColor: T.error, backgroundColor: T.errorLight },

  progressTrack: {
    height: 4, backgroundColor: T.border,
    borderRadius: 2, marginBottom: 6, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: T.primary,
    borderRadius: 2,
  },
  progressLabel: { fontSize: 12, color: T.textMuted, marginBottom: 20, textAlign: 'right' },

  primaryBtn: {
    backgroundColor: T.primary, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', marginBottom: 20,
    shadowColor: T.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled:    { opacity: 0.45, shadowOpacity: 0 },

  resendRow:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  resendLabel:  { fontSize: 14, color: T.textSub },
  resendTimer:  { fontSize: 14, color: T.textMuted, fontWeight: '600' },
  resendLink:   { fontSize: 14, color: T.primary, fontWeight: '700' },

  hintBox: {
    backgroundColor: T.primaryLight, borderRadius: 10,
    padding: 14, borderWidth: 1, borderColor: '#C7D2FE',
  },
  hintText: { fontSize: 13, color: T.primary, lineHeight: 19 },
});
