import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
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
  updateDoc,
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function MessageCenterScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReplies();
  }, []);

  async function loadReplies() {
    setLoading(true);
    try {
      // Fetch messages where user has posted and there are replies
      const q = query(
        collection(db, 'messages'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      const withReplies = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((msg) => msg.replies && msg.replies.length > 0);
      setReplies(withReplies);
    } catch (err) {
      console.error('Load replies error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteMessage(messageId) {
    Alert.alert('Delete', 'Remove this notification from your inbox?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setReplies((prev) => prev.filter((m) => m.id !== messageId));
          try {
            await updateDoc(doc(db, 'messages', messageId), { replies: [] });
          } catch (err) {
            console.error('Delete error:', err);
          }
        },
      },
    ]);
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
      {replies.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No Messages Yet</Text>
          <Text style={styles.emptySubtitle}>
            When someone replies to your chat posts, you'll see them here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={replies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.messageCard}>
              <TouchableOpacity
                style={styles.messageContent}
                onPress={() => goToChallenge(item.challengeId)}
              >
                <View style={styles.messageHeader}>
                  <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
                  <Text style={styles.messageTitle} numberOfLines={1}>
                    {item.text || '(photo)'}
                  </Text>
                  <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
                </View>
                <View style={styles.repliesPreview}>
                  {item.replies.slice(0, 2).map((reply, i) => (
                    <View key={i} style={styles.replyRow}>
                      <View style={styles.replyAvatar}>
                        <Text style={styles.replyAvatarText}>
                          {(reply.userDisplayName || 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.replyBubble}>
                        <Text style={styles.replyAuthor}>{reply.userDisplayName}</Text>
                        <Text style={styles.replyText} numberOfLines={1}>{reply.text}</Text>
                      </View>
                    </View>
                  ))}
                  {item.replies.length > 2 && (
                    <Text style={styles.moreReplies}>
                      +{item.replies.length - 2} more replies
                    </Text>
                  )}
                </View>
                <Text style={styles.tapHint}>Tap to view in challenge chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteMessage(item.id)}
              >
                <View style={styles.deleteCircle}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.white} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl, gap: SPACING.md },
  emptyTitle: { fontSize: SIZES.xlarge, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: SIZES.medium, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  list: { padding: SPACING.lg },
  messageCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOW.small,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  messageContent: { flex: 1, padding: SPACING.md },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  messageTitle: {
    flex: 1,
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  messageTime: { fontSize: SIZES.xsmall, color: COLORS.textSecondary },
  repliesPreview: { gap: SPACING.sm, marginBottom: SPACING.sm },
  replyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  replyAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  replyAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: SIZES.xsmall },
  replyBubble: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  replyAuthor: { fontSize: SIZES.xsmall, fontWeight: '600', color: COLORS.primary },
  replyText: { fontSize: SIZES.small, color: COLORS.textPrimary },
  moreReplies: { fontSize: SIZES.small, color: COLORS.primary, fontWeight: '500', marginLeft: SPACING.xl },
  tapHint: { fontSize: SIZES.xsmall, color: COLORS.textSecondary, fontStyle: 'italic' },
  deleteBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderLeftWidth: 1,
    borderColor: COLORS.border,
  },
  deleteCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.red,
    alignItems: 'center', justifyContent: 'center',
  },
});
