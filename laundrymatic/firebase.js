// firebase.js

const firebaseConfig = {
    apiKey: "AIzaSyAUgB3ZurB1nlnIYEn61F4KvQIu62SHVws",
    authDomain: "laundrymatic-51608.firebaseapp.com",
    databaseURL: "https://laundrymatic-51608-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "laundrymatic-51608",
    storageBucket: "laundrymatic-51608.firebasestorage.app",
    messagingSenderId: "367190879892",
    appId: "1:367190879892:web:d38852f150ef475ad2ce81"
};

// ── FIX: use firebase.initializeApp() not initializeApp() ────
// The CDN compat version attaches everything to the global
// firebase object — you access it as firebase.initializeApp()
firebase.initializeApp(firebaseConfig);

// Now db works correctly
const db = firebase.database();
const auth = firebase.auth();

// ── HELPER FUNCTIONS ─────────────────────────────────────────

function generateTransactionCode() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 900 + 100);
    return `JO-${date}-${random}`;
}

function calculatePickupTime(kg, timeIn) {
    const hour = parseInt(timeIn.split(':')[0]);
    if (kg <= 15) {
        if (hour < 12) {
            return { pickupDate: 'Today', pickupTime: '3:00 PM' };
        } else {
            return { pickupDate: 'Tomorrow', pickupTime: '10:00 AM' };
        }
    } else {
        return { pickupDate: 'Tomorrow', pickupTime: '3:00 PM' };
    }
}



// ── CUSTOMER FUNCTIONS ───────────────────────────────────────

async function saveCustomer(shopId, customerData) {
    const newRef = db.ref('users').push();
    const userId = newRef.key;
    await newRef.set({
        ...customerData,
        shopId,
        profileQR: userId,
        createdAt: new Date().toISOString(),
    });
    return userId;
}

async function getCustomer(userId) {
    const snapshot = await db.ref(`users/${userId}`).once('value');
    return snapshot.val();
}

async function getCustomerByQR(qrValue) {
    return await getCustomer(qrValue);
}

// ── ORDER FUNCTIONS ──────────────────────────────────────────

async function createOrder(shopId, userId, orderData) {
    const newRef = db.ref('orders').push();
    const orderId = newRef.key;

    const now = new Date();
    const timestamp = now.getTime(); // Captured for history consistency
    // Preserve offline-computed values if provided (a synced order
    // keeps the moment it was actually created, not the sync time) —
    // falls back to computing fresh, exactly as before, for every
    // normal online order
    const timeIn = orderData.timeIn || now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    const dateIn = orderData.dateIn || now.toLocaleDateString('en-PH');
    const finish = orderData.estimatedFinish
        ? {
            estimatedFinish: orderData.estimatedFinish,
            estimatedFinishTime: orderData.estimatedFinishTime,
            estimatedFinishDate: orderData.estimatedFinishDate,
            hours: orderData.estimatedHours,
          }
        : calculateFinishTime(orderData.kg);

    // Save order data
        await newRef.set({
        ...orderData,
        orderId,
        userId,
        shopId,
        transactionCode: orderData.transactionCode || generateTransactionCode(),
        status: orderData.status || 'washing',
        dateIn,
        timeIn,
        estimatedFinish: finish.estimatedFinish,
        estimatedFinishTime: finish.estimatedFinishTime,
        estimatedFinishDate: finish.estimatedFinishDate,
        estimatedHours: finish.hours,
        orderQR: orderId,
        createdAt: orderData.createdAt || now.toISOString(),
    });

    // Save ONE weight snapshot per order — with auto-expiry tracking
    await db.ref('weightHistory').push({
        kg: orderData.kg,
        timestamp: timestamp,
        orderId: orderId,
        expiresAt: timestamp + (24 * 60 * 60 * 1000), // deletes after 24h via routine cleanup
    });

    // Send "received" notification to customer's mobile app
    if (userId) {
        await sendNotificationToUser(userId,
            'Laundry Received',
            `Your ${orderData.kg}kg laundry has been received. ` +
            `Estimated finish: ${finish.estimatedFinishTime} (${finish.hours} hrs).`,
            { orderId, type: 'received' }
        );
    }

    return orderId;
}

async function getAllOrders(shopId) {
    const snapshot = await db.ref('orders').orderByChild('shopId').equalTo(shopId).once('value');
    const data = snapshot.val();
    if (!data) return [];
    return Object.entries(data)
        .map(([id, order]) => ({ id, ...order }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getOrdersByUser(userId) {
    const snapshot = await db.ref('orders')
        .orderByChild('userId')
        .equalTo(userId)
        .once('value');
    const data = snapshot.val();
    if (!data) return [];
    return Object.entries(data)
        .map(([id, order]) => ({ id, ...order }))
        .reverse();
}

async function updateOrderStatus(orderId, newStatus) {
    await db.ref(`orders/${orderId}`).update({ status: newStatus });

    // When laundry is ready, notify the customer
    if (newStatus === 'ready') {
        // Get the order to find the userId
        const snapshot = await db.ref(`orders/${orderId}`).once('value');
        const order = snapshot.val();

        if (order && order.userId) {
            await sendNotificationToUser(order.userId,
                'Laundry Ready for Pickup!',
                `Your laundry (${order.transactionCode}) is done and ready for pickup.`,
                { orderId, type: 'ready' }
            );
        }
    }
}

// Checks if a contact number already belongs to another registered
// customer (pending or approved) — prevents split/duplicate profiles
async function findCustomerByContact(shopId, contact) {
    const snapshot = await db.ref('users').orderByChild('shopId').equalTo(shopId).once('value');
    const data = snapshot.val();
    if (!data) return null;

    const match = Object.entries(data).find(([id, u]) =>
        u.contact1 === contact || u.contact2 === contact
    );

    return match ? { id: match[0], ...match[1] } : null;
}

async function getOrderByQR(qrValue) {
    const snapshot = await db.ref(`orders/${qrValue}`).once('value');
    return snapshot.val();
}

async function getSettings(shopId) {
    const snap = await db.ref('settings/' + shopId).once('value');
    return snap.val() || { minWeightKg: 3 };
}

async function saveSettingsToFirebase(shopId, settings) {
    await db.ref('settings/' + shopId).update(settings);
}

// ── REALTIME LISTENERS ───────────────────────────────────────

function listenToOrders(shopId, callback) {
    db.ref('orders').orderByChild('shopId').equalTo(shopId).on('value', snapshot => {
        const data = snapshot.val();
        if (!data) { callback([]); return; }
        const orders = Object.entries(data)
            .map(([id, order]) => ({ id, ...order }))
            .reverse();
        callback(orders);
    });
}

function listenToLiveWeight(callback) {
    db.ref('liveWeight').on('value', snapshot => {
        const data = snapshot.val();
        // Now also passes bridge.js's `active` flag through, so the
        // frontend can visually distinguish "idle" from "weighing"
        if (data) callback(data.kg, data.updatedAt, data.active);
    });
}

// ── ADMIN NOTIFICATIONS FEED ─────────────────────────────────
// /notifications/{userId}/{pushId} already exists — written by
// sendNotificationToUser() whenever an order is received or
// becomes ready. This reads the /notifications ROOT (all
// customers at once) in a single listener, then flattens it
// into one combined, time-sorted feed for the admin dashboard.
// No new Firebase paths — this only aggregates data that's
// already being written for the mobile app's own notifications.

function listenToAllNotifications(callback) {
    db.ref('notifications').on('value', snapshot => {
        const data = snapshot.val();
        if (!data) { callback([]); return; }

        const flat = [];
        Object.entries(data).forEach(([userId, userNotifs]) => {
            Object.entries(userNotifs).forEach(([notifId, notif]) => {
                flat.push({ userId, notifId, ...notif });
            });
        });

        flat.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        callback(flat);
    }, err => {
        console.error('Error listening to notifications:', err);
    });
}

// Marks one notification as read at its exact Firebase path
async function markNotificationRead(userId, notifId) {
    await db.ref(`notifications/${userId}/${notifId}`).update({ read: true });
}

// Marks one notification back to unread — mirrors markNotificationRead
async function markNotificationUnread(userId, notifId) {
    await db.ref(`notifications/${userId}/${notifId}`).update({ read: false });
}

// ── CUSTOMER VALIDATION ──────────────────────────────────────

// Gets all customers with status = 'pending' (not yet validated)
async function getPendingCustomers(shopId) {
    const snapshot = await db.ref('users').orderByChild('shopId').equalTo(shopId).once('value');
    const data = snapshot.val();
    if (!data) return [];
    return Object.entries(data)
        .map(([id, u]) => ({ id, ...u }))
        .filter(u => u.status === 'pending');
}

async function getApprovedCustomers(shopId) {
    const snapshot = await db.ref('users').orderByChild('shopId').equalTo(shopId).once('value');
    const data = snapshot.val();
    if (!data) return [];
    return Object.entries(data)
        .map(([id, u]) => ({ id, ...u }))
        .filter(u => u.status === 'approved');
}

// Approves a customer — makes their QR printable
async function approveCustomer(userId) {
    await db.ref(`users/${userId}`).update({ status: 'approved' });
}

// Gets all customers regardless of status
async function getAllCustomers(shopId) {
    const snapshot = await db.ref('users').orderByChild('shopId').equalTo(shopId).once('value');
    const data = snapshot.val();
    if (!data) return [];
    return Object.entries(data).map(([id, u]) => ({ id, ...u }));
}

// ── ESTIMATED FINISH TIME ────────────────────────────────────

// Calculates finish time based on weight
// 5–10 kg  → 3 hours
// 11–20 kg → 6 hours
function calculateFinishTime(kg) {
    const now = new Date();
    const hours = kg <= 10 ? 3 : 6;
    const finish = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const timeStr = finish.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
    });
    const dateStr = finish.toLocaleDateString('en-PH');

    return {
        hours,
        estimatedFinish: finish.toISOString(),
        estimatedFinishTime: timeStr,
        estimatedFinishDate: dateStr,
    };
}

// ── PUSH NOTIFICATIONS VIA FIREBASE ─────────────────────────
// Saves a notification record to Firebase
// The mobile app listens to /notifications/{userId} in real time
// For push when app is closed, you need FCM (Step 8)

async function sendNotificationToUser(userId, title, body, data = {}) {
    await db.ref(`notifications/${userId}`).push({
        title,
        body,
        data,
        read: false,
        createdAt: new Date().toISOString(),
    });
}

// ── CONNECTIVITY STATE ───────────────────────────────────────
function listenToConnectionState(callback) {
    db.ref('.info/connected').on('value', snap => {
        callback(snap.val() === true);
    });
}

// ── OFFLINE PENDING ORDERS QUEUE ─────────────────────────────
// localStorage survives a reload/restart — RTDB's own offline
// cache is memory-only and would be lost in a real brownout.
function getPendingOrders(shopId) {
    const data = localStorage.getItem('lm_pending_orders_' + shopId);
    return data ? JSON.parse(data) : [];
}

function savePendingOrder(shopId, order) {
    const pending = getPendingOrders(shopId);
    pending.push(order);
    localStorage.setItem('lm_pending_orders_' + shopId, JSON.stringify(pending));
}

function removePendingOrder(shopId, localId) {
    const pending = getPendingOrders(shopId).filter(o => o.localId !== localId);
    localStorage.setItem('lm_pending_orders_' + shopId, JSON.stringify(pending));
}

// ── OFFLINE CUSTOMER CACHE ────────────────────────────────────
// Refreshed opportunistically whenever a customer list is
// successfully fetched while online — read from when offline so
// scanning/searching a KNOWN customer still works mid-outage.
function updateCustomerCache(shopId, customers) {
    const map = {};
    customers.forEach(c => { map[c.id] = c; });
    localStorage.setItem('lm_customer_cache_' + shopId, JSON.stringify(map));
}

function getCachedCustomer(shopId, userId) {
    const data = localStorage.getItem('lm_customer_cache_' + shopId);
    const map = data ? JSON.parse(data) : {};
    return map[userId] || null;
}

function getCachedCustomers(shopId) {
    const data = localStorage.getItem('lm_customer_cache_' + shopId);
    const map = data ? JSON.parse(data) : {};
    return Object.values(map);
}