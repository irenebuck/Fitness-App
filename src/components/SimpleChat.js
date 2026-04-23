import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, SIZES, RADIUS } from '../theme';

/**
 * SimpleChat — simplified, flat chat for an active challenge.
 *
 * Scope (v1):
 *   - Text + user only. No image attachments, no threaded replies.
 *   - Real-time via Firestore onSnapshot.
 *   - Scoped to a single challengeId (passed in as a prop).
 *
 * Forward compatibility:
 *   - Writes to the shared `messages` collection. Optional fields
 *     (imageURL, replies[]) remain permitted by the schema and rules,
 *     so a richer chat can be added later — no data
 *     migration required.
 *
 * Author: Kevin Penate  |  Progress Report #1  |  2026-04-22
 */
export default function SimpleChat({ challengeId }) {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef(null);

  // Subscribe to this challenge's messages.
  //
  // NOTE: We intentionally do NOT add orderBy('timestamp') to the query.
  // For a simplified chat the message volume
  // per challenge is tiny, so we sort client-side instead and keep
  // setup friction at zero.
  useEffect(() => {
    if (!challengeId) return;
    const q = query(
      collection(db, 'messages'),
      where('challengeId', '==', challengeId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Ascending order. Messages without a server timestamp yet
        // (very brief window right after send) get sorted to the end.
        docs.sort((a, b) => {
          const ta = a.timestamp?.toMillis ? a.timestamp.toMillis() : Infinity;
          const tb = b.timestamp?.toMillis ? b.timestamp.toMillis() : Infinity;
          return ta - tb;
        });
        setMessages(docs);
        setLoading(false);
        // Auto-scroll so the newest message is always visible.
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
      },
      (err) => {
        // Don't leave the UI stuck on the spinner if Firestore errors out.
        console.error('SimpleChat subscription error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [challengeId]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        challengeId,
        userId: user.uid,
        userDisplayName: userProfile?.displayName || user.displayName || 'User',
        text: trimmed,
        timestamp: serverTimestamp(),
      });
      setText('');
    } catch (err) {
      console.error('SimpleChat send error:', err);
    } finally {
      setSending(false);
    }
  }

  function renderMessage({ item }) {
    const isOwn = item.userId === user.uid;
    return (
      <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
        {!isOwn && (
          <Text style={styles.author}>{item.userDisplayName || 'User'}</Text>
        )}
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: false })
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No messages yet. Start the conversation!
          </Text>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={COLORS.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!text.trim() || sending) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Ionicons name="send" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { padding: SPACING.xl, alignItems: 'center' },
  listContent: { padding: SPACING.md, paddingBottom: SPACING.lg },
  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: SPACING.xl,
  },
  row: { marginBottom: SPACING.sm, maxWidth: '80%' },
  rowOwn: { alignSelf: 'flex-end' },
  rowOther: { alignSelf: 'flex-start' },
  author: {
    fontSize: SIZES.xsmall,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    marginBottom: 2,
  },
  bubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  bubbleOwn: { backgroundColor: COLORS.primary, borderTopRightRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.white, borderTopLeftRadius: 4 },
  bubbleText: {
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  bubbleTextOwn: { color: COLORS.white },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});