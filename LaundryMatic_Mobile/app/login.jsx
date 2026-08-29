// app/login.jsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
    Image
} from 'react-native';

import { AlertTriangle, Check } from 'lucide-react-native';
import AuthButton from '../components/AuthButton';
import AuthInput from '../components/AuthInput';
import Colors from '../constants/colors';
import { auth } from '../utils/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  getRememberedEmail,
  setRememberedEmail,
  clearRememberedEmail,
} from '../utils/storage';

export default function LoginScreen() {

  const router = useRouter();
  // Form field values — each is a piece of state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // On load: pre-fill remembered username if it exists
  useEffect(() => {
    async function prefill() {
      const saved = await getRememberedEmail();
      if (saved) {
        setUsername(saved);
        setRemember(true);
      }
    }
    prefill();
  }, []);

  // Called when Sign In button is tapped
  async function handleLogin() {
    setError('');

    if (!username || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, username, password);

      if (remember) {
        await setRememberedEmail(username);
      } else {
        await clearRememberedEmail();
      }

      // Navigate to Dashboard
      // replace() means the user can't press Back to return to Login
      router.replace('/dashboard');
    } catch (err) {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    // KeyboardAvoidingView pushes content up when keyboard opens
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── BRAND HEADER ─────────────────────── */}
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Image
                source={require('../assets/images/laundrymatic-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>LaundryMatic</Text>
          <Text style={styles.brandTag}>IoT Weighing System</Text>
        </View>


        {/* ── FORM CARD ────────────────────────── */}
        <View style={styles.card}>

          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account</Text>

          {/* Error message — only shown when error is not empty */}
          {error ? (
              <View style={styles.errorBox}>
                <AlertTriangle color={Colors.danger} size={15} style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
          ) : null}

          <AuthInput
              label="Email"
              placeholder="you@example.com"
              value={username}
              onChangeText={setUsername}
              keyboardType="email-address"
              autoCapitalize="none"
          />

          <AuthInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureText={true}
          />

          {/* Remember me + Forgot password row */}
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setRemember(r => !r)}
            >
              <View style={[styles.checkbox, remember && styles.checkboxOn]}>
                {remember && <Check color="#ffffff" size={12} strokeWidth={3} />}
              </View>
              <Text style={styles.rememberLabel}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/forgotPassword')}>
              <Text style={styles.link}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <AuthButton
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{"Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.link}>Create one here</Text>
            </TouchableOpacity>
          </View>

        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  // Brand header
  brand: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBox: {
    width: 200,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    alignSelf: 'center',
  },
  logoImage: {
    width: 200,
    height: 200,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandTag: {
    fontSize: 11,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // Form card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.muted2,
    marginBottom: 24,
  },

  // Error box
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 74, 106, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 74, 106, 0.25)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    flexShrink: 0,
  },
  errorText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 13,
  },

  // Remember me row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
  rememberLabel: {
    fontSize: 13,
    color: Colors.muted2,
  },
  link: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '600',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: Colors.muted,
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Colors.muted2,
  },
});
