import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, StatusBar } from 'react-native';

export default function SplashScreen({ onDone }) {
  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const ringScale   = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Ring expands
      Animated.parallel([
        Animated.timing(ringScale,   { toValue: 1,   duration: 500, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0.15, duration: 500, useNativeDriver: true }),
      ]),
      // Logo pops in
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // App name fades in
      Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      // Tagline fades in
      Animated.timing(tagOpacity,  { toValue: 1, duration: 350, useNativeDriver: true }),
      // Hold
      Animated.delay(700),
    ]).start(() => onDone?.());
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Decorative rings */}
      <Animated.View style={[styles.ring, styles.ringOuter, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
      <Animated.View style={[styles.ring, styles.ringInner, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <Text style={styles.logoIcon}>🏛️</Text>
      </Animated.View>

      {/* App name */}
      <Animated.Text style={[styles.appName, { opacity: textOpacity }]}>
        CampusCare
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
        Smart Facility Management
      </Animated.Text>

      {/* Bottom badge */}
      <Animated.Text style={[styles.badge, { opacity: tagOpacity }]}>
        UNIFLOW · University Platform
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  ringOuter: { width: 320, height: 320 },
  ringInner: { width: 220, height: 220 },

  logoWrap: {
    width: 96, height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoIcon: { fontSize: 46 },

  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  badge: {
    position: 'absolute',
    bottom: 48,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
