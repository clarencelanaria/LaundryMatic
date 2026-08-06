// app/notifications.jsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
    View, Text, ScrollView,
    StyleSheet, TouchableOpacity,
} from 'react-native';
import Colors from '../constants/colors';
import {
    listenToNotifications,
    markNotificationRead,
} from '../utils/notifications';
import { getCurrentUser, getUsers } from '../utils/storage';

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifs, setNotifs] = useState([]);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        let unsubscribe;

        async function init() {
            const username = await getCurrentUser();
            const users = await getUsers();
            const localUser = users.find(u => u.username === username);
            const uid = localUser?.firebaseId;

            if (!uid) return;
            setUserId(uid);

            unsubscribe = listenToNotifications(uid, incoming => {
                setNotifs(incoming);
            });
        }
        init();

        return () => {
            if (unsubscribe)
                unsubscribe();
        };
    }, []);

    async function handleRead(notifId) {
        if (!userId) return;
        await markNotificationRead(userId, notifId);
        setNotifs(prev => prev.filter(n => n.id !== notifId));
    }

    // Icon per notification type
    const icons = {
        received: '🧺',
        ready: '✅',
        default: '🔔',
    };

    return (
        <View style={styles.screen}>

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                >
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {notifs.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No new notifications.</Text>
                    </View>
                ) : (
                    notifs.map(n => (
                        <TouchableOpacity
                            key={n.id}
                            style={styles.card}
                            onPress={() => handleRead(n.id)}
                        >
                            <Text style={styles.icon}>
                                {icons[n.data?.type] || icons.default}
                            </Text>
                            <View style={styles.body}>
                                <Text style={styles.title}>{n.title}</Text>
                                <Text style={styles.bodyText}>{n.body}</Text>
                                <Text style={styles.time}>
                                    {new Date(n.createdAt).toLocaleTimeString('en-PH', {
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                    {' · '}
                                    {new Date(n.createdAt).toLocaleDateString('en-PH')}
                                </Text>
                            </View>
                            <View style={styles.unreadDot} />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20, paddingTop: 56,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        gap: 14,
    },
    backBtn: {
        width: 36, height: 36,
        backgroundColor: Colors.surface2,
        borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
    },
    backIcon: { color: Colors.text, fontSize: 18 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },

    scroll: { padding: 16, gap: 10 },
    empty: { alignItems: 'center', padding: 40 },
    emptyText: { color: Colors.muted2, fontSize: 15 },

    card: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 14,
        gap: 12,
        alignItems: 'flex-start',
    },
    icon: { fontSize: 22 },
    body: { flex: 1 },
    title: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 3 },
    bodyText: { fontSize: 13, color: Colors.muted2, lineHeight: 18, marginBottom: 4 },
    time: { fontSize: 11, color: Colors.muted, fontFamily: 'monospace' },
    unreadDot: {
        width: 8, height: 8,
        borderRadius: 4,
        backgroundColor: Colors.accent,
        marginTop: 4,
    },
});
