// app/index.jsx
// With Expo Router, this file is the root entry point.
// It handles the auth check and redirects to the right screen.
// No NavigationContainer or Stack.Navigator needed here.

import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';
import { getCurrentUser, seedDefaultUser } from '../utils/storage';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      await seedDefaultUser();
      const user = await getCurrentUser();
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
    init();
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
