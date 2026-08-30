// app/terms.jsx
import React, { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
    View, Text, ScrollView,
    StyleSheet, TouchableOpacity,
} from 'react-native';
import Colors from '../constants/colors';
import { ArrowLeft, Check } from 'lucide-react-native';
import AuthButton from '../components/AuthButton';
import {
    auth, acceptCurrentAgreements,
    hasAcceptedCurrentTerms, hasAcknowledgedCurrentPrivacy,
} from '../utils/firebase';
import { signOut } from 'firebase/auth';

// Same content as the web app's Terms modal — keep both in sync
// whenever CURRENT_TERMS_VERSION changes.
const TERMS_SECTIONS = [
    { title: '1. Acceptance of Terms', body: 'By accessing or using LaundryMatic, you confirm that you have read, understood, and agreed to these Terms and Conditions. If you do not agree with any part of these terms, you should not create an account or continue using the system.' },
    { title: '2. User Accounts', body: "Users are responsible for providing accurate and complete information when creating an account. Users are also responsible for keeping their account credentials, including their email address and password, secure and confidential.\n\nUsers must not share their account with unauthorized individuals or use another person's account without permission.\n\nLaundryMatic reserves the right to suspend or restrict access to accounts that are found to contain false information, unauthorized activity, or misuse of the system." },
    { title: '3. Smart Weighing System', body: 'LaundryMatic uses an IoT-based weighing system to record the weight of laundry items. The recorded weight may be used to calculate laundry charges based on the pricing and minimum charge settings established by the laundry service provider.\n\nIn case of technical errors, sensor inaccuracies, or system interruptions, the laundry service provider may verify and manually adjust the recorded weight when necessary.' },
    { title: '4. Laundry Charges and Payments', body: 'Laundry charges are calculated based on the weight of the laundry and the pricing rules set by the laundry service provider. A minimum charge may apply even if the recorded weight is below the minimum required for the standard rate.\n\nPayment may be classified as either Pay Now (paid during the transaction) or Pay Later (paid upon claiming the laundry).' },
    { title: '5. Laundry Collection and Pickup', body: 'Laundry should be collected within the period specified by the laundry service provider. Customers may be required to present the appropriate QR code, account information, receipt, or other verification method before their laundry is released.' },
    { title: '6. User Responsibilities', body: "Users agree to use LaundryMatic only for its intended purpose. Users must not provide false information, access another user's account without permission, interfere with or disrupt the system, manipulate laundry weight, payment, or order data, or use the system for fraudulent or unauthorized activities." },
    { title: '7. QR Codes', body: 'LaundryMatic may use QR codes for customer identification, account verification, laundry order tracking, payment processing, or pickup verification. Users are responsible for keeping their QR codes secure.' },
    { title: '8. System Availability', body: 'LaundryMatic is an IoT-based system and may depend on hardware, sensors, internet connectivity, and other technologies. The system may occasionally experience delays, interruptions, or technical issues, and does not guarantee uninterrupted availability.' },
    { title: '9. Limitation of Liability', body: 'LaundryMatic is designed to assist in managing laundry services and should not be solely relied upon where manual verification is necessary. The developers and administrators are not responsible for losses resulting from unauthorized account access, incorrect information, misuse, or technical or hardware failures.' },
    { title: '10. Changes to the Terms and Conditions', body: 'LaundryMatic may update these Terms when necessary. Users may be required to review and accept updated Terms before continuing to use the system.' },
    { title: '11. Acceptance', body: 'By checking "I have read and agree to the Terms and Conditions," you confirm that you have read, understood, and agreed to all the terms stated above.' },
];

// Same content as the web app's Privacy modal — keep in sync
// whenever CURRENT_PRIVACY_VERSION changes.
const PRIVACY_SECTIONS = [
    { title: '1. Introduction', body: 'LaundryMatic is designed to process personal information in accordance with applicable data privacy principles and requirements under Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012.\n\nLaundryMatic processes personal information in line with the principles of Transparency, Legitimate Purpose, and Proportionality.' },
    { title: '2. Personal Information Collected', body: 'Depending on how you use LaundryMatic, the system may collect: your full name, contact number(s), email address, account login information, address, an optional linked social media account, laundry order details, laundry weight recorded by the IoT weighing system, service type, payment status, order status, pickup/collection records, and QR code or account identification information.' },
    { title: '3. Purpose of Processing', body: 'Personal information is processed to create and manage user accounts, authenticate users at login, identify and manage customer registrations, process and manage laundry job orders, record laundry weight, calculate laundry charges, record payment and order status, verify laundry pickup, generate transaction records, provide technical support, and maintain the security and proper operation of the system.' },
    { title: '4. Collection and Processing of Personal Information', body: 'Information is collected directly from you when you register an account, submit a laundry order, or interact with system features such as QR code scanning. Some information — such as laundry weight — is captured automatically through the IoT smart weighing system.' },
    { title: '5. Data Storage and Firebase Services', body: 'LaundryMatic uses Firebase Authentication to manage account login, and Firebase Realtime Database to store account and transaction information. Personal information and system data are stored and processed through these Google Firebase cloud services, and are not stored solely on your device.' },
    { title: '6. Access to Personal Information', body: 'Access to personal information is limited to authorized personnel — such as laundry shop administrators and staff — who need access for legitimate system and laundry service purposes.' },
    { title: '7. Data Protection and Security', body: "LaundryMatic implements reasonable technical and organizational measures appropriate to the system's actual design and available security controls to help protect personal information against unauthorized access, alteration, disclosure, loss, or misuse. You are responsible for keeping your account password and login credentials confidential and secure." },
    { title: '8. Data Retention', body: "Personal information is retained only for as long as necessary for the purposes described in this Privacy Notice, for ongoing system operations, or other applicable requirements. LaundryMatic does not currently have an automatic data deletion schedule; when information is no longer necessary, it may be deleted, anonymized, or otherwise appropriately managed." },
    { title: '9. Data Subject Rights', body: 'Subject to applicable law, you have the right to be informed, to access your personal information, to request correction, to object to certain processing, to withdraw consent where processing is based on consent, and to lodge a complaint with the National Privacy Commission where applicable. LaundryMatic does not currently offer a self-service tool to view, edit, or delete your account information directly — to exercise these rights, please contact the system administrator.' },
    { title: '10. Consent and Withdrawal of Consent', body: 'Where processing is based on your consent, you may withdraw that consent at any time by contacting the system administrator. Withdrawing consent may affect your ability to use features that require that information.' },
    { title: '11. Changes to the Privacy Notice', body: 'LaundryMatic may update this Privacy Notice when necessary. You may be required to review and acknowledge an updated Privacy Notice before continuing to use the system.' },
    { title: '12. Contact Information', body: 'For questions about this Privacy Notice or to exercise your data subject rights, please contact the laundry shop administrator directly.' },
    { title: '13. Acknowledgment', body: 'By checking the acknowledgment checkbox, you confirm that you have read and understood this Privacy Notice, and, where required, consent to the collection and processing of your personal information as described above.' },
];

export default function TermsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isGate = params.mode === 'gate';

    // Non-gate mode (opened from a register.jsx link) shows exactly
    // one document, fixed by the link that opened it. Gate mode
    // always starts on whichever tab is actually outdated.
    const [activeTab, setActiveTab] = useState(params.doc === 'privacy' ? 'privacy' : 'terms');

    const [termsChecked, setTermsChecked] = useState(false);
    const [privacyChecked, setPrivacyChecked] = useState(false);
    const [termsAlreadyOk, setTermsAlreadyOk] = useState(false);
    const [privacyAlreadyOk, setPrivacyAlreadyOk] = useState(false);
    const [loading, setLoading] = useState(false);

    // On gate mode, pre-check/lock whichever document is already
    // current for this user — mirrors the web gate's behavior so a
    // Terms-only version bump doesn't force re-reading a still-current
    // Privacy Notice.
    React.useEffect(() => {
        if (!isGate) return;
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        (async () => {
            const [termsOk, privacyOk] = await Promise.all([
                hasAcceptedCurrentTerms(uid),
                hasAcknowledgedCurrentPrivacy(uid),
            ]);
            setTermsAlreadyOk(termsOk);
            setPrivacyAlreadyOk(privacyOk);
            setTermsChecked(termsOk);
            setPrivacyChecked(privacyOk);
            setActiveTab(termsOk ? 'privacy' : 'terms');
        })();
    }, [isGate]);

    async function handleAccept() {
        const uid = auth.currentUser?.uid;
        if (!uid) { router.replace('/login'); return; }

        setLoading(true);
        try {
            await acceptCurrentAgreements(
                { acceptTerms: termsChecked, acceptPrivacy: privacyChecked },
                uid
            );
            router.replace('/dashboard');
        } finally {
            setLoading(false);
        }
    }

    async function handleLogoutInstead() {
        await signOut(auth);
        router.replace('/login');
    }

    const canAccept = termsChecked && privacyChecked;
    const sections = activeTab === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS;
    const introText = activeTab === 'terms'
        ? 'Welcome to LaundryMatic, an IoT-based smart weighing and laundry management system designed to assist laundry service providers and customers in managing laundry transactions, customer information, laundry weight, order status, and related services.'
        : null;

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                {!isGate && (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ArrowLeft color={Colors.text} size={18} />
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>
                    {isGate ? 'Terms & Privacy Update' : activeTab === 'terms' ? 'Terms and Conditions' : 'Privacy Notice'}
                </Text>
            </View>

            {isGate && (
                <View style={styles.tabRow}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'terms' && styles.tabActive]}
                        onPress={() => setActiveTab('terms')}
                    >
                        <Text style={[styles.tabLabel, activeTab === 'terms' && styles.tabLabelActive]}>Terms & Conditions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'privacy' && styles.tabActive]}
                        onPress={() => setActiveTab('privacy')}
                    >
                        <Text style={[styles.tabLabel, activeTab === 'privacy' && styles.tabLabelActive]}>Privacy Notice</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.updated}>Last Updated: August 29, 2026</Text>
                {introText && <Text style={styles.intro}>{introText}</Text>}

                {sections.map((s, i) => (
                    <View key={i} style={styles.section}>
                        <Text style={styles.sectionTitle}>{s.title}</Text>
                        <Text style={styles.sectionBody}>{s.body}</Text>
                    </View>
                ))}
            </ScrollView>

            {isGate && (
                <View style={styles.gateFooter}>
                    <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => !termsAlreadyOk && setTermsChecked(!termsChecked)}
                        disabled={termsAlreadyOk}
                    >
                        <View style={[styles.checkbox, termsChecked && styles.checkboxChecked]}>
                            {termsChecked && <Check color="#ffffff" size={14} />}
                        </View>
                        <Text style={styles.checkboxLabel}>
                            I have read and agree to the Terms &amp; Conditions.
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => !privacyAlreadyOk && setPrivacyChecked(!privacyChecked)}
                        disabled={privacyAlreadyOk}
                    >
                        <View style={[styles.checkbox, privacyChecked && styles.checkboxChecked]}>
                            {privacyChecked && <Check color="#ffffff" size={14} />}
                        </View>
                        <Text style={styles.checkboxLabel}>
                            I have read and acknowledge the Privacy Notice and, where required, consent to the collection and processing of my personal information as described in the Privacy Notice.
                        </Text>
                    </TouchableOpacity>

                    <AuthButton
                        label="Accept and Continue"
                        onPress={handleAccept}
                        loading={loading}
                        disabled={!canAccept}
                    />

                    <TouchableOpacity onPress={handleLogoutInstead} style={{ marginTop: 10 }}>
                        <Text style={styles.logoutLink}>Not now — log out</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center',
        padding: 20, paddingTop: 56, gap: 14,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    backBtn: {
        width: 36, height: 36, backgroundColor: Colors.surface2,
        borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, flexShrink: 1 },
    tabRow: {
        flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0,
        backgroundColor: Colors.surface,
    },
    tab: {
        flex: 1, paddingVertical: 8, borderRadius: 8,
        alignItems: 'center', backgroundColor: Colors.surface2,
    },
    tabActive: { backgroundColor: Colors.accent },
    tabLabel: { fontSize: 12, fontWeight: '700', color: Colors.muted2 },
    tabLabelActive: { color: '#ffffff' },
    scroll: { padding: 20, paddingBottom: 40 },
    updated: { fontSize: 12, fontWeight: '700', color: Colors.muted, marginBottom: 10 },
    intro: { fontSize: 13, color: Colors.muted2, lineHeight: 20, marginBottom: 20 },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 6 },
    sectionBody: { fontSize: 13, color: Colors.muted2, lineHeight: 20 },
    gateFooter: {
        padding: 20, borderTopWidth: 1, borderTopColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
    checkbox: {
        width: 20, height: 20, borderRadius: 4, borderWidth: 1.5,
        borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
        marginTop: 1,
    },
    checkboxChecked: { backgroundColor: Colors.accent, borderColor: Colors.accent },
    checkboxLabel: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 18 },
    logoutLink: { fontSize: 13, color: Colors.muted2, textAlign: 'center' },
});