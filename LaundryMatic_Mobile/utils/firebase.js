// utils/firebase.js
import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import {
    getDatabase, ref,
    set, push, get,
    query, orderByChild,
    equalTo, onValue
} from 'firebase/database';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Same config as your web app — paste your values here
const firebaseConfig = {
    apiKey: "AIzaSyAUgB3ZurB1nlnIYEn61F4KvQIu62SHVws",
    authDomain: "laundrymatic-51608.firebaseapp.com",
    databaseURL: "https://laundrymatic-51608-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "laundrymatic-51608",
    storageBucket: "laundrymatic-51608.firebasestorage.app",
    messagingSenderId: "367190879892",
    appId: "1:367190879892:web:d38852f150ef475ad2ce81"
};


const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// getReactNativePersistence doesn't exist in Firebase's web build —
// only call it on actual mobile. On web, plain getAuth() already
// persists sessions in the browser on its own.
export const auth = Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
    });

// Gets all orders for a specific customer by their userId
export async function getOrdersForUser(userId) {
    const ordersRef = query(
        ref(db, 'orders'),
        orderByChild('userId'),
        equalTo(userId)
    );

    const snapshot = await get(ordersRef);
    const data = snapshot.val();
    if (!data) return [];

    return Object.entries(data)
        .map(([id, order]) => ({ id, ...order }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Checks if a contact number is already registered — mirrors the
// same check on the web dashboard so both sides stay consistent
export async function checkDuplicateContact(contact) {
    const snapshot = await get(ref(db, 'users'));
    const data = snapshot.val();
    if (!data) return null;

    const entry = Object.entries(data).find(
        ([id, u]) => u.contact1 === contact || u.contact2 === contact
    );

    return entry ? { id: entry[0], ...entry[1] } : null;
}

// Gets one order by orderId (when customer scans order QR)
export async function getOrderById(orderId) {
    const snapshot = await get(ref(db, `orders/${orderId}`));
    return snapshot.val();
}

// Gets a customer profile by userId (when scanning profile QR)
export async function getCustomerById(userId) {
    const snapshot = await get(ref(db, `users/${userId}`));
    return snapshot.val();
}

// Saves a new customer profile — keyed by their Firebase Auth uid
// (instead of a random push key) so the login account and the
// customer record are always the same ID
export async function registerCustomerMobile(uid, customerData) {
    await set(ref(db, `users/${uid}`), {
        ...customerData,
        profileQR: uid,
        status: 'pending',   // hidden from dashboard until admin validates
        createdAt: new Date().toISOString(),
    });
    return uid;
}

// Listens to realtime order updates for one customer
// callback is called every time an order changes
export function listenToUserOrders(userId, callback) {
    const ordersRef = query(
        ref(db, 'orders'),
        orderByChild('userId'),
        equalTo(userId)
    );

    const unsubscribe = onValue(ordersRef, snapshot => {
        const data = snapshot.val();
        if (!data) { callback([]); return; }

        const orders = Object.entries(data)
            .map(([id, order]) => ({ id, ...order }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        callback(orders);
    });

    // Return unsubscribe so the screen can stop listening when it unmounts
    return unsubscribe;
}

// Listens to live sensor weight for the mobile app
export function listenToSensorWeight(callback) {
    const weightRef = ref(db, 'liveWeight');
    const unsubscribe = onValue(weightRef, snapshot => {
        const data = snapshot.val();
        if (data && data.kg !== undefined) {
            callback(data.kg, data.updatedAt);
        }
    });
    return unsubscribe;
}
