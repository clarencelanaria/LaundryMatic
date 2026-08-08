// app/dashboard.jsx
import React, { useEffect, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { useRouter } from 'expo-router';
import * as Brightness from 'expo-brightness';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import Colors from '../constants/colors';
import {
  clearCurrentUser, getCurrentUser,
  getUsers
} from '../utils/storage';
import {
  getOrdersForUser,
  getCustomerById
} from '../utils/firebase';

// Status display config
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: Colors.accent3, icon: '⏳' },
  washing: { label: 'Washing', color: Colors.accent2, icon: '🌀' },
  ready: { label: 'Ready!', color: Colors.accent, icon: '✅' },
  picked: { label: 'Picked Up', color: Colors.muted2, icon: '📦' },
  cancelled: { label: 'Cancelled', color: Colors.danger, icon: '✕' },
};

export default function DashboardScreen() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [originalBrightness, setOriginalbrightness] = useState(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    return () => {
      if (originalBrightness !== null) {
        Brightness.setBrightnessAsync(originalBrightness).catch(() => {});
      }
    };
  }, [originalBrightness]);

  async function loadData() {
  try {
    const currentUsername = await getCurrentUser();
    setUsername(currentUsername || '');

    if (!currentUsername) {
      setLoading(false);
      return;
    }

    const users     = await getUsers();
    const localUser = users.find(u => u.username === currentUsername);

    if (!localUser) {
      setLoading(false);
      return;
    }

    const firebaseId = localUser.firebaseId;

    if (!firebaseId) {
      // firebaseId missing — user registered before this field existed
      // Show dashboard without Firebase profile data
      console.warn('No firebaseId found for user:', currentUsername);
      setLoading(false);
      return;
    }

    // Load customer profile from Firebase
    const profile = await getCustomerById(firebaseId);

    if (!profile) {
      console.warn('No Firebase profile found for id:', firebaseId);
      setLoading(false);
      return;
    }

    setCustomer({ id: firebaseId, ...profile });

    // Load their orders
    const userOrders = await getOrdersForUser(firebaseId);
    setOrders(userOrders || []);

  } catch (err) {
    console.error('Error loading dashboard:', err);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}

// Toggles the QR card and boosts screen brightness while it's shown —
// glare/dim screens are the #1 cause of failed scans in real shop lighting
  async function toggleQR() {
    const next = !showQR;
    setShowQR(next);

    try {
      if (next) {
        const { status } = await Brightness.requestPermissionsAsync();
        if (status === 'granted') {
          const current = await Brightness.getBrightnessAsync();
          setOriginalBrightness(current);
          await Brightness.setBrightnessAsync(1);
        }
      } else if (originalBrightness !== null) {
        await Brightness.setBrightnessAsync(originalBrightness);
        setOriginalBrightness(null);
      }
    } catch (err) {
      // Some devices/emulators don't support brightness control — fail silently
      console.warn('Brightness adjustment not available:', err);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  async function handleLogout() {
    await clearCurrentUser();
    router.replace('/login');
  }

  // Split orders into active and past
  const activeOrders = orders.filter(
    o => o.status !== 'picked' && o.status !== 'cancelled'
  );
  const pastOrders = orders.filter(
    o => o.status === 'picked' || o.status === 'cancelled'
  );

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>

      {/* ── HEADER ─────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>🧺 LaundryMatic</Text>
          <Text style={styles.sub}>
            Hello, {customer?.firstName || username} 👋
          </Text>
        </View>
        <View style={styles.headerRight}>
          {/* Notifications bell */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/notifications')}
          >
            <Text style={styles.iconBtnText}>🔔</Text>
          </TouchableOpacity>
          {/* Logout */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleLogout}
          >
            <Text style={styles.iconBtnText}>⏻</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent}
          />
        }
      >

        {/* ── VALIDATION STATUS CARD ──────────────── */}
        {customer && (
          <View style={[
            styles.statusCard,
            customer.status === 'approved'
              ? styles.statusApproved
              : styles.statusPending
          ]}>
            <Text style={styles.statusCardIcon}>
              {customer.status === 'approved' ? '✅' : '⏳'}
            </Text>
            <View style={styles.statusCardBody}>
              <Text style={styles.statusCardTitle}>
                {customer.status === 'approved'
                  ? 'Account Validated'
                  : 'Waiting for Validation'}
              </Text>
              <Text style={styles.statusCardText}>
                {customer.status === 'approved'
                  ? 'Your account is active. You can now drop off laundry.'
                  : 'Show your QR code to shop staff to activate your account.'}
              </Text>
            </View>
          </View>
        )}

        {/* Show QR button if still pending */}
        {customer?.status === 'pending' && (
          <TouchableOpacity
            style={styles.showQRBtn}
            onPress={() => router.push({
              pathname: '/showQR', params: {
                userId: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                contact1: customer.contact1,
              }
            })
            }
          >
            <Text style={styles.showQRBtnText}>
              📱 Show My QR Code
            </Text>
          </TouchableOpacity>
        )}

        {/* ── PROFILE QR CARD ─────────────────────── */}
        {customer?.status === 'approved' && customer?.id && (
          <View style={styles.qrCard}>

            {/* Top row: title + toggle button */}
            <View style={styles.qrCardHeader}>
              <View>
                <Text style={styles.qrCardTitle}>
                  My Profile QR Code
                </Text>
                <Text style={styles.qrCardSub}>
                  Show this to shop staff to create an order
                  or mark your laundry as picked up
                </Text>
              </View>
              <TouchableOpacity
                style={styles.qrToggleBtn}
                onPress={toggleQR}
              >
                <Text style={styles.qrToggleBtnText}>
                  {showQR ? 'Hide' : 'Show QR'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* QR code — shown when toggled open */}
            {showQR && (
              <View style={styles.qrContent}>

                {/* The actual QR code */}
                <View style={styles.qrCodeBox}>
                  <QRCode
                      value={customer.id}
                      size={220}
                      color="#000000"
                      backgroundColor="#ffffff"
                      ecl="H"
                      quietZone={12}
                  />
                </View>

                <Text style={styles.qrCustomerName}>
                  {customer.firstName} {customer.lastName}
                </Text>
                <Text style={styles.qrContact}>
                  {customer.contact1}
                </Text>

                {/* How to use instructions */}
                <View style={styles.qrInstructions}>
                  <View style={styles.qrInstructionRow}>
                    <Text style={styles.qrInstructionIcon}>1</Text>
                    <Text style={styles.qrInstructionText}>
                      Show this QR when dropping off laundry —
                      admin scans to instantly create your order
                    </Text>
                  </View>
                  <View style={styles.qrInstructionRow}>
                    <Text style={styles.qrInstructionIcon}>2</Text>
                    <Text style={styles.qrInstructionText}>
                      Show this QR when picking up —
                      admin scans to mark your order as picked up
                    </Text>
                  </View>
                </View>

              </View>
            )}

          </View>
        )}

        {/* ── ACTIVE ORDERS ───────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Orders</Text>
          <Text style={styles.sectionCount}>
            {activeOrders.length}
          </Text>
        </View>

        {activeOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🧺</Text>
            <Text style={styles.emptyTitle}>No active orders</Text>
            <Text style={styles.emptyText}>
              Drop off your laundry at the shop and your
              orders will appear here automatically.
            </Text>
          </View>
        ) : (
          activeOrders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))
        )}

        {/* ── PAST ORDERS ─────────────────────────── */}
        {pastOrders.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Past Orders</Text>
              <Text style={styles.sectionCount}>
                {pastOrders.length}
              </Text>
            </View>
            {pastOrders.map(order => (
              <OrderCard key={order.id} order={order} past />
            ))}
          </>
        )}

        {/* Bottom padding */}
        <View style={{ height: 32 }} />

      </ScrollView>
    </View>
  );
}

// ── ORDER CARD COMPONENT ──────────────────────────────────────
function OrderCard({ order, past = false }) {
  const s = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  return (
    <View style={[styles.orderCard, past && styles.orderCardPast]}>

      {/* Top row: transaction code + status badge */}
      <View style={styles.orderTop}>
        <Text style={styles.txnCode}>{order.transactionCode}</Text>
        <View style={[styles.badge, { borderColor: s.color }]}>
          <Text style={styles.badgeDot}>{s.icon}</Text>
          <Text style={[styles.badgeText, { color: s.color }]}>
            {s.label}
          </Text>
        </View>
      </View>

      {/* Details grid */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>SERVICE</Text>
          <Text style={styles.detailValue}>{order.service}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>WEIGHT</Text>
          <Text style={styles.detailValue}>{order.kg} kg</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>AMOUNT</Text>
          <Text style={[styles.detailValue, { color: Colors.accent }]}>
            ₱{Number(order.amount).toFixed(0)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>DATE IN</Text>
          <Text style={styles.detailValue}>{order.dateIn}</Text>
        </View>
      </View>

      {/* ETA / pickup row */}
      {order.status !== 'picked' && order.status !== 'cancelled' && (
        <View style={[
          styles.etaRow,
          order.status === 'ready' && styles.etaRowReady,
        ]}>
          <Text style={styles.etaLabel}>
            {order.status === 'ready'
              ? '✅ Ready for pickup now'
              : `⏰ Est. finish: ${order.estimatedFinishTime || '—'}`}
          </Text>
          {order.estimatedHours && order.status !== 'ready' && (
            <Text style={styles.etaHours}>
              ~{order.estimatedHours}h
            </Text>
          )}
        </View>
      )}

    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  loadingScreen: {
    flex: 1, backgroundColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  loadingText: { color: Colors.muted2, fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20, paddingTop: 56,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', gap: 8 },
  logo: { fontSize: 17, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 12, color: Colors.muted2, marginTop: 2 },

  iconBtn: {
    width: 36, height: 36,
    backgroundColor: Colors.surface2,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  iconBtnText: { fontSize: 14 },

  scroll: { padding: 16 },

  // Validation status card
  statusCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  statusApproved: {
    backgroundColor: 'rgba(74,244,176,0.06)',
    borderColor: 'rgba(74,244,176,0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(244,162,74,0.06)',
    borderColor: 'rgba(244,162,74,0.2)',
  },
  statusCardIcon: { fontSize: 22 },
  statusCardBody: { flex: 1 },
  statusCardTitle: {
    fontSize: 14, fontWeight: '700',
    color: Colors.text, marginBottom: 3,
  },
  statusCardText: { fontSize: 12, color: Colors.muted2, lineHeight: 17 },

  // Show QR button
  showQRBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1, borderColor: Colors.accent,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  showQRBtnText: {
    fontSize: 14, fontWeight: '700', color: Colors.accent,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10, marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: Colors.text,
  },
  sectionCount: {
    fontSize: 12, color: Colors.muted2,
    fontFamily: 'monospace',
    backgroundColor: Colors.surface2,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },

  // Empty state
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: {
    fontSize: 15, fontWeight: '700',
    color: Colors.text, marginBottom: 6,
  },
  emptyText: {
    fontSize: 12, color: Colors.muted2,
    textAlign: 'center', lineHeight: 18,
  },

  // Order card
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 12,
  },
  orderCardPast: { opacity: 0.65 },

  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  txnCode: {
    fontFamily: 'monospace', fontSize: 13,
    color: Colors.accent2, fontWeight: '600',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  badgeDot: { fontSize: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  detailsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, marginBottom: 12,
  },
  detailItem: { width: '45%' },
  detailLabel: {
    fontSize: 10, color: Colors.muted,
    fontWeight: '600', letterSpacing: 0.8, marginBottom: 2,
  },
  detailValue: { fontSize: 14, color: Colors.text, fontWeight: '600' },

  // ETA row
  etaRow: {
    backgroundColor: Colors.surface2,
    borderRadius: 8, padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaRowReady: {
    backgroundColor: 'rgba(74,244,176,0.08)',
    borderWidth: 1, borderColor: 'rgba(74,244,176,0.2)',
  },
  etaLabel: { fontSize: 12, color: Colors.muted2 },
  etaHours: {
    fontSize: 12, color: Colors.accent2,
    fontFamily: 'monospace', fontWeight: '600',
  },

  // QR Card
  qrCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },

  qrCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },

  qrCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 3,
  },

  qrCardSub: {
    fontSize: 11,
    color: Colors.muted2,
    lineHeight: 16,
    flex: 1,
    maxWidth: 220,
  },

  qrToggleBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexShrink: 0,
  },

  qrToggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  // QR content shown when expanded
  qrContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 20,
  },

  qrCodeBox: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  qrCustomerName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },

  qrContact: {
    fontSize: 13,
    color: Colors.muted2,
    fontFamily: 'monospace',
    marginBottom: 20,
  },

  // Numbered instructions below QR
  qrInstructions: {
    width: '100%',
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },

  qrInstructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  qrInstructionIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
    flexShrink: 0,
  },

  qrInstructionText: {
    fontSize: 12,
    color: Colors.muted2,
    lineHeight: 18,
    flex: 1,
  },
});
