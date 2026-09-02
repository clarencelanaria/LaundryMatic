// utils/notifications.js
// Push notifications require a development build (not Expo Go).
// For now we use Firebase realtime listeners for in-app notifications only.
// The listenToNotifications and markNotificationRead functions work in Expo Go.

import { ref, onValue, update } from 'firebase/database';
import { db } from './firebase';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { savePushToken } from './firebase';

// Requests permission, gets this device's Expo push token, and saves
// it to Firebase. Call this once, right after login. Safe to call
// again on later logins — it just overwrites the same field.
export async function registerForPushNotifications(userId) {
    if (!Device.isDevice) {
        console.log('Push notifications need a real device — skipped (simulator/emulator).');
        return null;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        console.log('Notification permission not granted.');
        return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    console.log("=============================");
    console.log("EXPO PUSH TOKEN:", token);
    console.log("=============================");

    await savePushToken(userId, token);
    return token;
}

// Listens to /notifications/{userId} in Firebase realtime.
// Works in Expo Go. Shows in-app when app is open.
export function listenToNotifications(userId, callback) {
    const notifRef = ref(db, `notifications/${userId}`);

    const unsubscribe = onValue(notifRef, snapshot => {
        const data = snapshot.val();
        if (!data) return;

        const unread = Object.entries(data)
            .map(([id, n]) => ({ id, ...n }))
            .filter(n => !n.read)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (unread.length > 0) {
            callback(unread);
        }
    });

    return unsubscribe;
}

// Marks one notification as read in Firebase
export async function markNotificationRead(userId, notifId) {
    await update(ref(db, `notifications/${userId}/${notifId}`), {
        read: true,
    });
}