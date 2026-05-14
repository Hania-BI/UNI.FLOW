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
};

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail]             = useState('');
  const [focused, setFocused]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [inlineError, setInlineError] = useState('');

  const btnScale = useRef(new Animated.Value(1)).current;
  const slideY   = useRef(new Animated.Value(30)).current;
  const opacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideY,  { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  function pressIn()  { Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start(); }

  async function handleSubmit() {
    setInlineError('');
    if (!email.trim()) {
      setInlineError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setInlineError('Please enter a valid email address.');
      return;
    }
    try {
      setSubmitting(true);
      await apiPost('/auth/forgot-password', { email: email.trim() });
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (err) {
      setInlineError(err.message);
    } finally {
      setSubmitting(false);
    }
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
            <Text style={styles.icon}>🔑</Text>
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your account email address. We'll verify it exists and let you set a new password.
          </Text>

          {!!inlineError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{inlineError}</Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputWrap, focused && styles.inputWrapFocus]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="you@university.edu"
                placeholderTextColor={T.textMuted}
                value={email}
                onChangeText={(v) => { setEmail(v); setInlineError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="done"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={handleSubmit}
              />
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              onPress={handleSubmit}
              onPressIn={pressIn}
              onPressOut={pressOut}
              disabled={submitting}
              style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Verify Email  →</Text>}
            </Pressable>
          </Animated.View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🔒  Your account will be verified securely. You'll be taken directly to the password reset screen.
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, paddingHorizontal: 28, paddingTop: 56 },

  backBtn:  { marginBottom: 32 },
  backText: { color: T.primary, fontWeight: '700', fontSize: 15 },
  inner:    { flex: 1 },

  iconWrap: {
    width: 70, height: 70, borderRadius: 22,
    backgroundColor: T.primaryLight, alignItems: 'center',
    justifyContent: 'center', marginBottom: 20, alignSelf: 'flex-start',
  },
  icon:     { fontSize: 34 },
  title:    { fontSize: 26, fontWeight: '800', color: T.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: T.textSub, lineHeight: 22, marginBottom: 28 },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: T.errorLight, borderRadius: 10, borderWidth: 1,
    borderColor: '#FECACA', padding: 12, marginBottom: 16,
  },
  errorIcon: { fontSize: 14, marginTop: 1 },
  errorText: { flex: 1, fontSize: 13, color: T.error, lineHeight: 18 },

  fieldGroup:     { marginBottom: 20 },
  label:          { fontSize: 13, fontWeight: '600', color: T.text, marginBottom: 7 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: 12,
    borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 14,
  },
  inputWrapFocus: { borderColor: T.borderFocus },
  inputIcon:      { fontSize: 16, marginRight: 10 },
  input:          { flex: 1, paddingVertical: 14, fontSize: 15, color: T.text },

  primaryBtn: {
    backgroundColor: T.primary, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center',
    shadowColor: T.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled:    { opacity: 0.65 },

  infoBox: {
    backgroundColor: T.primaryLight, borderRadius: 10,
    padding: 14, marginTop: 20,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  infoText: { fontSize: 13, color: T.primary, lineHeight: 19 },
});
