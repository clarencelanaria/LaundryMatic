// app/showQR.jsx
import React, { useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
    View, Text, StyleSheet,
    ScrollView, TouchableOpacity,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Colors from '../constants/colors';

export default function ShowQRScreen() {
    const router = useRouter();
    const { userId, firstName, lastName, contact1 } = useLocalSearchParams();
    const qrRef = useRef();

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.scroll}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.logoEmoji}>🧺</Text>
                <Text style={styles.headerTitle}>Registration Successful!</Text>
                <Text style={styles.headerSub}>
                    Your personal QR code has been generated
                </Text>
            </View>

            {/* QR Card */}
            <View style={styles.qrCard}>
                <Text style={styles.qrLabel}>YOUR LAUNDRY QR CODE</Text>

                {/* QR Code */}
                <View style={styles.qrBox}>
                    <QRCode
                        value={userId}
                        size={200}
                        color={Colors.bg}
                        backgroundColor="#ffffff"
                        getRef={qrRef}
                    />
                </View>

                <Text style={styles.customerName}>
                    {firstName} {lastName}
                </Text>
                <Text style={styles.customerContact}>{contact1}</Text>

                <Text style={styles.userId}>
                    ID: {userId.slice(0, 12)}...
                </Text>
            </View>

            {/* Pending notice */}
            <View style={styles.noticeCard}>
                <Text style={styles.noticeIcon}>⏳</Text>
                <View style={styles.noticeBody}>
                    <Text style={styles.noticeTitle}>
                        Waiting for Admin Validation
                    </Text>
                    <Text style={styles.noticeText}>
                        Show this QR code to the laundry shop staff.
                        They will scan it to activate your account.
                        Once validated, you can track all your laundry orders here.
                    </Text>
                </View>
            </View>

            {/* Steps */}
            <View style={styles.stepsCard}>
                <Text style={styles.stepsTitle}>WHAT HAPPENS NEXT</Text>

                <View style={styles.step}>
                    <View style={styles.stepNum}>
                        <Text style={styles.stepNumText}>1</Text>
                    </View>
                    <Text style={styles.stepText}>
                        Show this QR to shop staff for scanning
                    </Text>
                </View>

                <View style={styles.step}>
                    <View style={styles.stepNum}>
                        <Text style={styles.stepNumText}>2</Text>
                    </View>
                    <Text style={styles.stepText}>
                        Staff validates and prints your QR card
                    </Text>
                </View>

                <View style={styles.step}>
                    <View style={styles.stepNum}>
                        <Text style={styles.stepNumText}>3</Text>
                    </View>
                    <Text style={styles.stepText}>
                        Stick the printed QR on your laundry basket
                    </Text>
                </View>

                <View style={styles.step}>
                    <View style={[styles.stepNum, { backgroundColor: Colors.accent }]}>
                        <Text style={[styles.stepNumText, { color: '#ffffff' }]}>4</Text>
                    </View>
                    <Text style={styles.stepText}>
                        Track your laundry status right here in the app
                    </Text>
                </View>
            </View>

            {/* Go to dashboard button */}
            <TouchableOpacity
                style={styles.continueBtn}
                onPress={() => router.replace('/dashboard')}
            >
                <Text style={styles.continueBtnText}>Continue to App →</Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bg },
    scroll: { padding: 24, paddingTop: 56 },

    header: { alignItems: 'center', marginBottom: 28 },
    logoEmoji: { fontSize: 40, marginBottom: 12 },
    headerTitle: {
        fontSize: 22, fontWeight: '800',
        color: Colors.text, marginBottom: 6, letterSpacing: -0.3,
    },
    headerSub: {
        fontSize: 13, color: Colors.muted2, textAlign: 'center',
    },

    // QR card
    qrCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        borderWidth: 1, borderColor: Colors.border,
        padding: 28,
        alignItems: 'center',
        marginBottom: 16,
    },
    qrLabel: {
        fontSize: 10, color: Colors.accent,
        fontWeight: '700', letterSpacing: 2,
        textTransform: 'uppercase', marginBottom: 20,
    },
    qrBox: {
        padding: 16,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 20,
    },
    customerName: {
        fontSize: 18, fontWeight: '800',
        color: Colors.text, marginBottom: 4,
    },
    customerContact: {
        fontSize: 13, color: Colors.muted2,
        fontFamily: 'monospace', marginBottom: 8,
    },
    userId: {
        fontSize: 11, color: Colors.muted,
        fontFamily: 'monospace',
    },

    // Pending notice
    noticeCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(244,162,74,0.08)',
        borderWidth: 1, borderColor: 'rgba(244,162,74,0.25)',
        borderRadius: 12, padding: 16,
        gap: 12, marginBottom: 16,
    },
    noticeIcon: { fontSize: 22 },
    noticeBody: { flex: 1 },
    noticeTitle: {
        fontSize: 14, fontWeight: '700',
        color: Colors.accent3, marginBottom: 4,
    },
    noticeText: {
        fontSize: 12, color: Colors.muted2, lineHeight: 18,
    },

    // Steps
    stepsCard: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1, borderColor: Colors.border,
        padding: 20, marginBottom: 24, gap: 14,
    },
    stepsTitle: {
        fontSize: 10, color: Colors.muted,
        fontWeight: '700', letterSpacing: 1.5,
        textTransform: 'uppercase', marginBottom: 4,
    },
    step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepNum: {
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: Colors.surface2,
        borderWidth: 1, borderColor: Colors.border,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    stepNumText: { fontSize: 12, fontWeight: '700', color: Colors.muted2 },
    stepText: { fontSize: 13, color: Colors.muted2, flex: 1 },

    continueBtn: {
        backgroundColor: Colors.accent,
        borderRadius: 12, padding: 14,
        alignItems: 'center',
    },
    continueBtnText: {
        fontSize: 15, fontWeight: '700', color: '#ffffff',
    },
});
