// utils/notifications.js
// Push notifications require a development build (not Expo Go).
// For now we use Firebase realtime listeners for in-app notifications only.
// The listenToNotifications and markNotificationRead functions work in Expo Go.

import { ref, onValue, update } from 'firebase/database';
import { db } from './firebase';

// Registers for push notifications.
// This does nothing in Expo Go — push only works in a dev build.
export async function registerForPushNotifications(userId) {
    console.log('Push notifications require a dev build. Skipped for now.');
    return null;
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