// bridge.js
// Reads weight from Arduino via USB Serial
// Only writes to Firebase when scale is active (weight above threshold)
// Deletes weight history records automatically after 24 hours

const { SerialPort }     = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const admin              = require('firebase-admin');
const serviceAccount     = require('./serviceAccountKey.json');

// ── CONFIGURATION ─────────────────────────────────────────────

const SERIAL_PORT    = 'COM3';         // Change to your port
const BAUD_RATE      = 9600;

const DATABASE_URL   = 'https://laundrymatic-51608-default-rtdb.asia-southeast1.firebasedatabase.app/';

// Weight must be above this to be considered "active weighing"
// Prevents noise readings when scale is empty
const WEIGHT_THRESHOLD = 0.5;          // kg

// How long to keep a weight history record before deleting it
// 86400000 = 24 hours in milliseconds
// Set to 3600000 for 1 hour if you want faster cleanup
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

// How often to check and clean up expired history records
// 3600000 = every 1 hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

// ── FIREBASE SETUP ─────────────────────────────────────────────

admin.initializeApp({
  credential:  admin.credential.cert(serviceAccount),
  databaseURL: DATABASE_URL,
});

const db = admin.database();
console.log('✅ Firebase connected');

// ── STATE TRACKING ─────────────────────────────────────────────

let lastWeight        = 0;      // last reading
let scaleActive       = false;  // true when weight is above threshold
let stableTimer       = null;   // timer for detecting stable weight
let lastWriteTime     = 0;      // throttle Firebase writes

// Only write to Firebase at most once every N milliseconds
// even if Arduino sends faster
const WRITE_THROTTLE_MS = 1000;  // 1 second

// ── SERIAL PORT SETUP ──────────────────────────────────────────

const port  = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

port.on('open', () => {
  console.log(`✅ Serial port ${SERIAL_PORT} opened`);
  console.log('⏳ Waiting for weight readings...');
  console.log(`📏 Threshold: ${WEIGHT_THRESHOLD} kg`);
  console.log(`🕐 History TTL: ${HISTORY_TTL_MS / 3600000} hour(s)`);
});

port.on('error', err => {
  console.error('❌ Serial port error:', err.message);
});

// ── MAIN DATA HANDLER ──────────────────────────────────────────

parser.on('data', async line => {
  const raw = line.trim();

  // Skip non-JSON startup messages from Arduino
  if (!raw.startsWith('{')) {
    console.log('Arduino:', raw);
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return; // skip malformed lines
  }

  if (data.error || data.weight === null || data.weight === undefined) {
    return;
  }

  const weight    = data.weight;
  const now       = Date.now();
  const isActive  = weight >= WEIGHT_THRESHOLD;

  // ── Always update /liveWeight (just one record, no history) ──
  // Throttle to avoid hammering Firebase every 500ms
  if (now - lastWriteTime >= WRITE_THROTTLE_MS) {
    lastWriteTime = now;

    await db.ref('liveWeight').set({
      kg:        weight,
      active:    isActive,
      updatedAt: new Date().toISOString(),
    });

    if (isActive) {
      console.log(`⚖  Active: ${weight.toFixed(2)} kg`);
    }
  }

  // ── Detect scale going active (something placed on it) ──────
  if (isActive && !scaleActive) {
    scaleActive = true;
    console.log(`🟢 Scale activated — ${weight.toFixed(2)} kg detected`);
  }

  // ── Detect scale going idle (item removed) ──────────────────
  if (!isActive && scaleActive) {
    scaleActive = false;
    console.log('⚪ Scale back to idle');

    // Clear any pending stable timer
    if (stableTimer) {
      clearTimeout(stableTimer);
      stableTimer = null;
    }
  }

  lastWeight = weight;
});

// ── SAVE WEIGHT SNAPSHOT ───────────────────────────────────────
// Called by the web dashboard when admin creates an order
// This saves ONE record per order — not one per second
// The dashboard calls Firebase directly so this function
// is here for reference — the actual call is in firebase.js

// To trigger from dashboard: call saveWeightSnapshot(weight)
// It saves to /weightHistory with a timestamp
// The cleanup job below deletes it after HISTORY_TTL_MS

async function saveWeightSnapshot(weight) {
  const timestamp = new Date().toISOString();
  const newRef    = db.ref('weightHistory').push();

  await newRef.set({
    kg:        weight,
    timestamp,
    expiresAt: Date.now() + HISTORY_TTL_MS,  // when to delete
  });

  console.log(`💾 Snapshot saved: ${weight.toFixed(2)} kg`);
  return newRef.key;
}

// ── AUTOMATIC CLEANUP JOB ──────────────────────────────────────
// Runs every hour (CLEANUP_INTERVAL_MS)
// Finds all /weightHistory records past their expiresAt time
// and deletes them automatically

async function cleanupExpiredHistory() {
  const now  = Date.now();

  try {
    const snapshot = await db.ref('weightHistory').once('value');
    const data     = snapshot.val();

    if (!data) {
      console.log('🧹 Cleanup: no history records found');
      return;
    }

    const keys    = Object.keys(data);
    let   deleted = 0;

    for (const key of keys) {
      const record = data[key];

      // Delete if expiresAt exists and has passed
      if (record.expiresAt && record.expiresAt < now) {
        await db.ref(`weightHistory/${key}`).remove();
        deleted++;
      }

      // Also delete very old records without expiresAt
      // (leftover from before this update)
      if (!record.expiresAt) {
        await db.ref(`weightHistory/${key}`).remove();
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`🧹 Cleanup: deleted ${deleted} expired record(s)`);
    } else {
      console.log('🧹 Cleanup: all records are still valid');
    }

  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

// Run cleanup once on startup to clear old accumulated data
console.log('🧹 Running initial cleanup of old weight history...');
cleanupExpiredHistory();

// Then run it on a schedule
setInterval(cleanupExpiredHistory, CLEANUP_INTERVAL_MS);

// ── GRACEFUL SHUTDOWN ──────────────────────────────────────────

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  port.close(() => {
    console.log('Serial port closed.');
    process.exit(0);
  });
});