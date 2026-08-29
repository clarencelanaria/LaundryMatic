// app/forgotPassword.jsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import AuthInput  from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import Colors     from '../constants/colors';
import { CheckCircle2, ArrowRight, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { auth } from '../utils/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  // Step 1 — enter username
  // Step 2 — answer security question + new password
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  // ── STEP 1: Find the account ────────────────────────────
  async function handleReset() {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(true);
    } catch (err) {
      setError('Could not send reset email. Check the address and try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── SUCCESS STATE ────────────────────────────────────────

  if (success) {
    return (
      <View style={styles.screen}>
        <View style={styles.successCard}>
          <CheckCircle2 color={Colors.accent} size={48} style={{ marginBottom: 16 }} />
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successText}>
            Check your email for a link to reset your password,
            then come back and log in.
          </Text>
          <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace('/login')}
          >
            <View style={styles.backBtnRow}>
              <Text style={styles.backBtnText}>
                Go to Login
              </Text>
              <ArrowRight color="#ffffff" size={15} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── MAIN FORM ────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
              style={styles.backArrowRow}
              onPress={() => router.back()}
          >
            <ArrowLeft color={Colors.accent} size={15} />
            <Text style={styles.backArrowText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.logoBox}>
            <Image
                source={require('../assets/images/laundrymatic-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we;ll send you a reset link
          </Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>

          {error ? (
              <View style={styles.errorBox}>
                <AlertTriangle color={Colors.danger} size={15} style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
          ) : null}

          <AuthInput
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
          />

          <AuthButton
              label="Send Reset Link"
              onPress={handleReset}
              loading={loading}
          />

        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 56,
  },

  // Header
  header:        { alignItems: 'center', marginBottom: 24 },
  backArrowRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', marginBottom: 20,
  },
  backArrowText: { fontSize: 14, color: Colors.accent, fontWeight: '600' },

  logoBox: {
    width: 150, height: 150,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  logoImage: {
    width: 150, height: 150,
  },

  title: {
    fontSize: 24, fontWeight: '800',
    color: Colors.text, letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13, color: Colors.muted2,
    textAlign: 'center', lineHeight: 18,
  },

  // Progress indicator
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  progressDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.accent,
  },
  progressLine: {
    width: 40, height: 2,
    backgroundColor: Colors.border,
  },

  // Form card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  stepLabel: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 18, fontWeight: '800',
    color: Colors.text, marginBottom: 20,
  },

  // Error box
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244,74,106,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244,74,106,0.25)',
    borderRadius: 8,
    padding: 12, marginBottom: 16,
  },
  errorIcon: { flexShrink: 0 },
  errorText: { flex: 1, color: Colors.danger, fontSize: 13 },

  // Security question display
  questionBox: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  questionLabel: {
    fontSize: 10,
    color: Colors.muted,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  questionText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    lineHeight: 20,
  },

  // Step back button
  stepBackBtn: {
    alignItems: 'center',
    marginTop: 8,
  },
  stepBackRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  stepBackText: {
    fontSize: 13,
    color: Colors.muted2,
  },

  // Success screen
  successCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon:  { fontSize: 48, marginBottom: 16 },
  successTitle: {
    fontSize: 24, fontWeight: '800',
    color: Colors.text, marginBottom: 10,
  },
  successText: {
    fontSize: 14, color: Colors.muted2,
    textAlign: 'center', lineHeight: 22,
    marginBottom: 32,
  },
  backBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  backBtnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  backBtnText: {
    fontSize: 15, fontWeight: '700', color: '#ffffff',
  },
});
