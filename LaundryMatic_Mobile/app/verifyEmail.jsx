// app/verifyEmail.jsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AuthButton from '../components/AuthButton';
import Colors from '../constants/colors';
import { AlertTriangle, MailCheck } from 'lucide-react-native';
import { auth, hasCompletedAllAgreements } from '../utils/firebase';
import { sendEmailVerification } from 'firebase/auth';

export default function VerifyEmailScreen() {
  const router = useRouter();
  // If we arrived here right after registration, these are set — they
  // let us forward straight to the QR screen once verified, same as
  // registration used to do before this screen existed. If they're
  // missing (arrived from login/index instead), we fall back to the
  // normal Terms-based routing further down.
  const { userId, firstName, lastName, contact1 } = useLocalSearchParams();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const email = auth.currentUser?.email || 'your email address';

  async function handleResend() {
    const user = auth.currentUser;
    if (!user) return;
    setResending(true);
    setStatusMsg('');
    try {
      await sendEmailVerification(user);
      setStatusMsg('Verification email sent — check your inbox (and spam folder).');
    } catch (err) {
      setStatusMsg(
        err.code === 'auth/too-many-requests'
          ? 'Too many attempts — please wait a few minutes before trying again.'
          : 'Could not send the email right now. Check your connection and try again.'
      );
    } finally {
      setResending(false);
    }
  }

  async function handleCheckVerification() {
    const user = auth.currentUser;
    if (!user) return;
    setChecking(true);
    setStatusMsg('');
    try {
      await user.reload();
      if (!user.emailVerified) {
        setStatusMsg('Still not verified — click the link in your email first, then try again.');
        setChecking(false);
        return;
      }

      if (userId) {
        // Came from registration — go straight to their QR code
        router.replace({
          pathname: '/showQR',
          params: { userId, firstName, lastName, contact1 },
        });
        return;
      }

      // Came from login/app-restart — continue the normal routing
      const completed = await hasCompletedAllAgreements(user.uid);
      router.replace(completed ? '/dashboard' : { pathname: '/terms', params: { mode: 'gate' } });
    } catch (err) {
      setStatusMsg('Could not check right now. Check your connection and try again.');
      setChecking(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.brand}>
        <View style={styles.logoBox}>
          <Image
            source={require('../assets/images/laundrymatic-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brandName}>LaundryMatic</Text>
      </View>

      <View style={styles.card}>
        <MailCheck color={Colors.accent} size={40} style={{ alignSelf: 'center', marginBottom: 12 }} />
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          Account created. We sent a confirmation link to{' '}
          <Text style={{ fontWeight: '600' }}>{email}</Text>. Open it and tap
          the link, then come back here and check again.
        </Text>

        {statusMsg ? (
          <View style={styles.statusBox}>
            <AlertTriangle color={Colors.accent3} size={15} style={{ marginRight: 6 }} />
            <Text style={styles.statusText}>{statusMsg}</Text>
          </View>
        ) : null}

        <AuthButton
          label="I've Verified My Email"
          onPress={handleCheckVerification}
          loading={checking}
        />
        <View style={{ height: 10 }} />
        <AuthButton
          label="Resend Verification Email"
          onPress={handleResend}
          loading={resending}
          variant="ghost"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: Colors.bg,
    padding: 24,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBox: {
    width: 64,
    height: 64,
    marginBottom: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff7e6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    color: '#7a5600',
  },
});