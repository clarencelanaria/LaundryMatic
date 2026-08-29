// app/index.jsx
// With Expo Router, this file is the root entry point.
// It handles the auth check and redirects to the right screen.
// No NavigationContainer or Stack.Navigator needed here.

import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';
import { auth } from '../utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    });
    return unsubscribe;
  }, [router]);

  // Show spinner while checking auth
  return (
    <View style={{
      flex: 1,
      backgroundColor: Colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <ActivityIndicator color={Colors.accent} size="large" />
    </View>
  );
}
