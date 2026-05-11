import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, RADIUS } from '../theme';

// Called from ActiveChallengeScreen.js
// message - full message from Firestore db with text, image, author, replies, and timestamp
// onReply - function to call when reply button is clicked. Optional.
export default function ChatMessage({ message, onReply }) {
  // Firestore uses special timestamp type that has .toDate() method
  // message.timestamp?.toDate — checks if the timestamp exists AND has a .toDate method. The ?. protects against the timestamp being null or undefined. 
  // If it does → call .toDate() to convert it to a regular JavaScript Date, then pass it to formatTime()
  // If it doesn't → use an empty string. This can happen briefly because Firestore uses serverTimestamp() which isn't immediately available right after posting — it takes a moment to come back from the server.
  const timeStr = message.timestamp?.toDate
    ? formatTime(message.timestamp.toDate())
    : '';

    // Takes a JavaScript data and returns it as a string.
  function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    // diff less than a minute counts as now
    if (diff < 60000) return 'just now';
    // diff in minutes ago
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    // diff in hours ago
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {message.userPhotoURL ? (
            <Image source={{ uri: message.userPhotoURL }} style={styles.avatarImg} />
          ) : (
            // If there isn't an image, uses first initial of userDisplayName or U if display name missing
            <Text style={styles.avatarText}>
              {(message.userDisplayName || 'U')[0].toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.meta}>
          <Text style={styles.author}>{message.userDisplayName || 'User'}</Text>
          <Text style={styles.time}>{timeStr}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {message.imageURL && (
          // resizeMode="cover" means image fills its container and crops rather than stretching or leaving gaps.
          <Image source={{ uri: message.imageURL }} style={styles.attachedImage} resizeMode="cover" />
        )}
        {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
      </View>

      {onReply && (
        // Reply button
        <TouchableOpacity style={styles.replyBtn} onPress={() => onReply(message)}>
          <Ionicons name="return-down-forward-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.replyText}>Reply</Text>
        </TouchableOpacity>
      )}

      {/* Nested replies - only renders when there are replies. 
      You can reply to a comment but CANNOT reply to a reply. */}
      {message.replies?.length > 0 && (
        <View style={styles.repliesContainer}>
          {message.replies.map((reply) => (
            <View key={reply.id} style={styles.replyItem}>
              <View style={styles.replyLine} />
              <View style={styles.replyContent}>
                <Text style={styles.replyAuthor}>{reply.userDisplayName}</Text>
                <Text style={styles.replyBody}>{reply.text}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: SIZES.medium,
  },
  meta: {
    flex: 1,
  },
  author: {
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  time: {
    fontSize: SIZES.xsmall,
    color: COLORS.textSecondary,
  },
  body: {
    marginLeft: 44,
  },
  attachedImage: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  text: {
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.sm,
    marginLeft: 44,
  },
  replyText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  repliesContainer: {
    marginTop: SPACING.sm,
    marginLeft: 44,
  },
  replyItem: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  replyLine: {
    width: 2,
    backgroundColor: COLORS.border,
    borderRadius: 1,
  },
  replyContent: {
    flex: 1,
  },
  replyAuthor: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  replyBody: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
});
