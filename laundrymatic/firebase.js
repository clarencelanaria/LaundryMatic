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

async function saveCustomer(customerData) {
    const newRef = db.ref('users').push();
    const userId = newRef.key;
    await newRef.set({
        ...customerData,
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

async function createOrder(userId, orderData) {
    const newRef = db.ref('orders').push();
    const orderId = newRef.key;

    const now = new Date();
    const timestamp = now.getTime(); // Captured for history consistency
    const timeIn = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    const dateIn = now.toLocaleDateString('en-PH');

    // Calculate finish time based on weight
    const finish = calculateFinishTime(orderData.kg);

    // Save order data
    await newRef.set({
        ...orderData,
        orderId,
        userId,
        transactionCode: generateTransactionCode(),
        status: 'pending',
        dateIn,
        timeIn,
        estimatedFinish: finish.estimatedFinish,
        estimatedFinishTime: finish.estimatedFinishTime,
        estimatedFinishDate: finish.estimatedFinishDate,
        estimatedHours: finish.hours,
        orderQR: orderId,
        createdAt: now.toISOString(),
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
            '🧺 Laundry Received',
            `Your ${orderData.kg}kg laundry has been received. ` +
            `Estimated finish: ${finish.estimatedFinishTime} (${finish.hours} hrs).`,
            { orderId, type: 'received' }
        );
    }

    return orderId;
}

async function getAllOrders() {
    const snapshot = await db.ref('orders').orderByChild('createdAt').once('value');
    const data = snapshot.val();
    if (!data) return [];
    return Object.entries(data)
        .map(([id, order]) => ({ id, ...order }))
        .reverse();
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
                '✅ Laundry Ready for Pickup!',
                `Your laundry (${order.transactionCode}) is done and ready for pickup.`,
                { orderId, type: 'ready' }
            );
        }
    }
}

// Checks if a contact number already belongs to another registered
// customer (pending or approved) — prevents split/duplicate profiles
async function findCustomerByContact(contact) {
    const snapshot = await db.ref('users').once('value');
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

async function getSettings() {
    const snap = await db.ref('settings').once('value');
    return snap.val() || { minWeightKg: 3 };
}

async function saveSettingsToFirebase(settings) {
    await db.ref('settings').set(settings);
}

// ── REALTIME LISTENERS ───────────────────────────────────────

function listenToOrders(callback) {
    db.ref('orders').on('value', snapshot => {
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
        if (data) callback(data.kg, data.updatedAt);
    });
}

// ── CUSTOMER VALIDATION ──────────────────────────────────────

// Gets all customers with status = 'pending' (not yet validated)
async function getPendingCustomers() {
    const snapshot = await db.ref('users')
        .orderByChild('status')
        .equalTo('pending')
        .once('value');
    const data = snapshot.val();
    if (!data) return [];
    return Object.entries(data).map(([id, u]) => ({ id, ...u }));
}

// Gets all approved customers
async function getApprovedCustomers() {
    const snapshot = await db.ref('users')
        .orderByChild('status')
        .equalTo('approved')
        .once('value');
    const data = snapshot.val();
    if (!data) return [];
    return Object.entries(data).map(([id, u]) => ({ id, ...u }));
}

// Approves a customer — makes their QR printable
async function approveCustomer(userId) {
    await db.ref(`users/${userId}`).update({ status: 'approved' });
}

// Gets all customers regardless of status
async function getAllCustomers() {
    const snapshot = await db.ref('users').once('value');
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