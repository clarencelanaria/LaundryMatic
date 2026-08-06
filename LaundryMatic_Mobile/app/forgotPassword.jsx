// app/forgotPassword.jsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AuthInput  from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import Colors     from '../constants/colors';
import { getUsers, saveUsers } from '../utils/storage';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  // Step 1 — enter username
  // Step 2 — answer security question + new password
  const [step,         setStep]         = useState(1);
  const [username,     setUsername]     = useState('');
  const [answer,       setAnswer]       = useState('');
  const [newPassword,  setNewPassword]  = useState('');
  const [confirm,      setConfirm]      = useState('');
  const [foundUser,    setFoundUser]    = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState(false);

  // ── STEP 1: Find the account ────────────────────────────

  async function handleFindAccount() {
    setError('');

    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }

    setLoading(true);

    const users = await getUsers();
    const user  = users.find(
      u => u.username.toLowerCase() === username.toLowerCase()
    );

    setLoading(false);

    if (!user) {
      setError('No account found with that username.');
      return;
    }

    if (!user.question || !user.answer) {
      setError(
        'This account has no security question set. ' +
        'Please contact the shop admin.'
      );
      return;
    }

    setFoundUser(user);
    setStep(2);
  }

  // ── STEP 2: Verify answer and reset password ────────────

  async function handleReset() {
    setError('');

    if (!answer.trim()) {
      setError('Please enter your answer.');
      return;
    }

    if (answer.trim() !== foundUser.answer) {
      setError('Incorrect answer. Please try again.');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    // Update the password in AsyncStorage
    const users = await getUsers();
    const index = users.findIndex(
      u => u.username.toLowerCase() === foundUser.username.toLowerCase()
    );

    if (index !== -1) {
      users[index].password = newPassword;
      await saveUsers(users);
    }

    setLoading(false);
    setSuccess(true);
  }

  // ── SUCCESS STATE ────────────────────────────────────────

  if (success) {
    return (
      <View style={styles.screen}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successText}>
            Your password has been updated successfully.
            You can now log in with your new password.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.backBtnText}>
              Go to Login →
            </Text>
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
            style={styles.backArrow}
            onPress={() => router.back()}
          >
            <Text style={styles.backArrowText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🧺</Text>
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Enter your username to find your account'
              : `Answer your security question`}
          </Text>
        </View>

        {/* Progress dots */}
        <View style={styles.progressRow}>
          <View style={[styles.progressDot,
            step >= 1 && styles.progressDotActive]} />
          <View style={styles.progressLine} />
          <View style={[styles.progressDot,
            step >= 2 && styles.progressDotActive]} />
        </View>

        {/* Form card */}
        <View style={styles.card}>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          {/* ── STEP 1 ─────────────────────────────── */}
          {step === 1 && (
            <>
              <Text style={styles.stepLabel}>STEP 1 OF 2</Text>
              <Text style={styles.stepTitle}>Find Your Account</Text>

              <AuthInput
                label="Username"
                placeholder="Enter your username"
                value={username}
                onChangeText={setUsername}
              />

              <AuthButton
                label="Find Account"
                onPress={handleFindAccount}
                loading={loading}
              />
            </>
          )}

          {/* ── STEP 2 ─────────────────────────────── */}
          {step === 2 && foundUser && (
            <>
              <Text style={styles.stepLabel}>STEP 2 OF 2</Text>
              <Text style={styles.stepTitle}>Verify Your Identity</Text>

              {/* Show the security question */}
              <View style={styles.questionBox}>
                <Text style={styles.questionLabel}>
                  SECURITY QUESTION
                </Text>
                <Text style={styles.questionText}>
                  {foundUser.question}
                </Text>
              </View>

              <AuthInput
                label="Your Answer"
                placeholder="Enter your answer (case-sensitive)"
                value={answer}
                onChangeText={setAnswer}
              />

              <AuthInput
                label="New Password"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureText={true}
              />

              <AuthInput
                label="Confirm New Password"
                placeholder="Repeat your new password"
                value={confirm}
                onChangeText={setConfirm}
                secureText={true}
              />

              <AuthButton
                label="Reset Password"
                onPress={handleReset}
                loading={loading}
              />

              {/* Go back to step 1 */}
              <TouchableOpacity
                style={styles.stepBackBtn}
                onPress={() => {
                  setStep(1);
                  setError('');
                  setAnswer('');
                  setNewPassword('');
                  setConfirm('');
                }}
              >
                <Text style={styles.stepBackText}>
                  ← Try a different username
                </Text>
              </TouchableOpacity>
            </>
          )}

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
  backArrow:     { alignSelf: 'flex-start', marginBottom: 20 },
  backArrowText: { fontSize: 14, color: Colors.accent, fontWeight: '600' },

  logoBox: {
    width: 56, height: 56,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  logoEmoji: { fontSize: 24 },

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
    backgroundColor: 'rgba(244,74,106,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244,74,106,0.25)',
    borderRadius: 8,
    padding: 12, marginBottom: 16,
  },
  errorText: { color: Colors.danger, fontSize: 13 },

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
  backBtnText: {
    fontSize: 15, fontWeight: '700', color: '#ffffff',
  },
});
