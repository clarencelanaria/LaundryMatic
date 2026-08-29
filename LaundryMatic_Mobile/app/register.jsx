// app/register.jsx
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
  Image,
} from 'react-native';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import Colors from '../constants/colors';
import { AlertTriangle } from 'lucide-react-native';
import { auth, registerCustomerMobile, checkDuplicateContact } from '../utils/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

// Password strength checker
function getStrength(value) {
  let s = 0;
  if (value.length >= 6) s++;
  if (/[A-Z]/.test(value)) s++;
  if (/[0-9]/.test(value)) s++;
  if (/[^A-Za-z0-9]/.test(value)) s++;
  return s;
}

const strengthLevels = [
  { label: '', color: 'transparent' },
  { label: 'Weak', color: Colors.danger },
  { label: 'Fair', color: Colors.accent3 },
  { label: 'Good', color: Colors.accent2 },
  { label: 'Strong', color: Colors.accent },
];



export default function RegisterScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contact1, setContact1] = useState('');
  const [contact2, setContact2] = useState('');
  const [address, setAddress] = useState('');
  const [fbAccount, setFbAccount] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = password.length > 0 ? getStrength(password) : 0;
  const strengthLevel = strengthLevels[strength];

  // Philippine mobile format: 09XXXXXXXXX
  function isValidPHContact(number) {
    return /^09\d{9}$/.test(number);
  }

  function sanitizeContactInput(value) {
    return value.replace(/\D/g, '').slice(0, 11);
  }


  async function handleRegister() {
    setError('');

    if (!firstName || !lastName || !contact1 || !address ||
        !username  || !password || !confirm) {
      setError('Please fill in all required fields.');
      return;
    }

    // ── Contact format validation ─────────────────────────────
    if (!isValidPHContact(contact1)) {
      setError('Contact Number 1 must be 11 digits starting with 09.');
      return;
    }
    if (contact2 && !isValidPHContact(contact2)) {
      setError('Contact Number 2 must be 11 digits starting with 09.');
      return;
    }
    if (contact2 && contact2 === contact1) {
      setError('Contact Number 2 cannot match Contact Number 1.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      // ── Duplicate contact check against Firebase ─────────────
      const duplicateCustomer = await checkDuplicateContact(contact1);
      if (duplicateCustomer) {
        setError('This contact number is already registered to another account.');
        setLoading(false);
        return;
      }

      // "username" holds an email — this creates the real Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, username, password);

      // Customer profile keyed by the same uid as the auth account
      await registerCustomerMobile(cred.user.uid, {
        firstName, lastName, contact1, contact2,
        address, fbAccount,
      });

      setLoading(false);

      // Go to QR screen — pass the userId so it can display the QR
      router.replace({
        pathname: '/showQR',
        params: { userId: cred.user.uid, firstName, lastName, contact1 }
      });

    } catch (err) {
      setError(err.message || 'Registration failed. Check your connection.');
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand header */}
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Image
                source={require('../assets/images/laundrymatic-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>LaundryMatic</Text>
          <Text style={styles.brandTag}>Create your account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Get started</Text>
          <Text style={styles.cardSubtitle}>
            Fill in your details to register
          </Text>

          {error ? (
              <View style={styles.errorBox}>
                <AlertTriangle color={Colors.danger} size={15} style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
          ) : null}

          {/* Name row */}
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <AuthInput
                label="First Name"
                placeholder="Juan"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={styles.nameField}>
              <AuthInput
                label="Last Name"
                placeholder="dela Cruz"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <AuthInput
              label="Contact Number 1"
              placeholder="09171234567"
              value={contact1}
              onChangeText={(text) => setContact1(sanitizeContactInput(text))}
              keyboardType="phone-pad"
          />

          <AuthInput
              label="Contact Number 2 (optional)"
              placeholder="09281234567"
              value={contact2}
              onChangeText={(text) => setContact2(sanitizeContactInput(text))}
              keyboardType="phone-pad"
          />

          <AuthInput
            label="Address"
            placeholder="Calinog, Iloilo"
            value={address}
            onChangeText={setAddress}
          />

          <AuthInput
            label="Facebook Account (optional)"
            placeholder="facebook.com/username"
            value={fbAccount}
            onChangeText={setFbAccount}
          />

          {/* Divider */}
          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>Login Credentials</Text>
            <View style={styles.dividerLine} />
          </View>

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
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={setPassword}
            secureText={true}
          />

          {/* Password strength bar */}
          {password.length > 0 && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthTrack}>
                <View style={[
                  styles.strengthFill,
                  {
                    width: `${(strength / 4) * 100}%`,
                    backgroundColor: strengthLevel.color,
                  }
                ]} />
              </View>
              <Text style={[
                styles.strengthLabel,
                { color: strengthLevel.color }
              ]}>
                {strengthLevel.label}
              </Text>
            </View>
          )}

          <AuthInput
            label="Confirm Password"
            placeholder="Repeat your password"
            value={confirm}
            onChangeText={setConfirm}
            secureText={true}
          />

          <AuthButton
            label="Register"
            onPress={handleRegister}
            loading={loading}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.link}>Sign in here</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48 },

  brand: { alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 150, height: 150,
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  logoImage: {
    width: 150, height: 150,
  },
  brandName: {
    fontSize: 26, fontWeight: '800',
    color: Colors.text, letterSpacing: -0.5, marginBottom: 4,
  },
  brandTag: {
    fontSize: 11, color: Colors.accent,
    textTransform: 'uppercase', letterSpacing: 2,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20, padding: 28,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 22, fontWeight: '800',
    color: Colors.text, marginBottom: 4, letterSpacing: -0.3,
  },
  cardSubtitle: { fontSize: 13, color: Colors.muted2, marginBottom: 24 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244,74,106,0.08)',
    borderWidth: 1, borderColor: 'rgba(244,74,106,0.25)',
    borderRadius: 8, padding: 12, marginBottom: 16,
  },
  errorIcon: { flexShrink: 0 },
  errorText: { flex: 1, color: Colors.danger, fontSize: 13 },

  nameRow: { flexDirection: 'row', gap: 12 },
  nameField: { flex: 1 },

  sectionDivider: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerLabel: { fontSize: 11, color: Colors.muted, letterSpacing: 0.8 },

  strengthWrap: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginTop: -8, marginBottom: 16,
  },
  strengthTrack: {
    flex: 1, height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2, overflow: 'hidden',
  },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '600', width: 44 },

  questionWrap: { marginBottom: 16 },
  qLabel: {
    fontSize: 11, color: Colors.muted2,
    fontWeight: '600', letterSpacing: 0.8, marginBottom: 6,
  },
  questionSelector: {
    backgroundColor: Colors.surface2,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: 14,
  },
  questionText: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  questionArrowRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  questionArrow: { fontSize: 11, color: Colors.accent },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
  },
  footerText: { fontSize: 13, color: Colors.muted2 },
  link: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
});