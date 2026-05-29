import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  limit
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function MessageCenterScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const {joinedChallenges = [], lastSeen = {} } = userSnap.data();
      const results = await Promise.all(
        joinedChallenges.map( async (challengeId)=> {
        // pull most recent message for the challenge
          const q = query(
            collection(db, 'messages'),
            where('challengeId', '==', challengeId),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          const snap = await getDocs(q);
          if (snap.empty) return null;

          const latest = snap.docs[0].data();
          const lastSeenTime = lastSeen[challengeId]?.toMillis?.() || 0;
          const latestTime = latest.timestamp?.toMillis?.() || 0;
          // if new message user hasn't seen yet
          if (latestTime <= lastSeenTime) return null;
          // no notification if users own message
          if (latest.userId === user.uid) return null;

          //fecth challenge title
          const chalSnap = await getDoc(doc(db, 'challenges', challengeId));
          const challengeTitile = chalSnap.exists()
            ? chalSnap.data().title
            : 'A challenge';

          return {challengeId, challengeTitle, latest };
        })
      );

      setNotifications(results.filter(Boolean));
    } catch (err) {
      console.error('Load notifications error:', err);
    } finally {
      setLoading(false);
    }
  }

  function goToChallenge(challengeId) {
    navigation.navigate('ActiveChallenge', { challengeId });
  }

  function formatTime(timestamp) {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    const diff = Date.now() - date;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>
            You'll see new message activity from your active challenges here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.challengeId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => goToChallenge(item.challengeId)}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.textWrap}>
                  <Text style={styles.challengeTitle} numberOfLines={1}>
                    {item.challengeTitle}
                  </Text>
                  <Text style={styles.preview} numberOfLines={2}> 
                    {item.latest.userDisplayName}: {item.latest.text || '(photo)'}
                  </Text>
                  <Text style={styles.time}>{formatTime(item.latest.timestamp)}</Text>
                </View>
                <Ionicons name="chevron forward" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
      
                

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: SPACING.xxl, gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: SIZES.xlarge, fontWeight: '700',
    color: COLORS.textPrimary, textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: SIZES.medium, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  list: { padding: SPACING.lg },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOW.small,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  challengeTitle: {
    fontSize: SIZES.medium, fontWeight: '700',
    color: COLORS.textPrimary, marginBottom: 2,
  },
  preview: {
    fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 18,
  },
  time: {
    fontSize: SIZES.xsmall, color: COLORS.textSecondary, marginTop: 4,
  },
});