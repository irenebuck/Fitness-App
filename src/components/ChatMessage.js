import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, RADIUS } from '../theme';

export default function ChatMessage({ message, currentUserId, onReply }) {
  const isOwn = message.userId === currentUserId;
  const timeStr = message.timestamp?.toDate
    ? formatTime(message.timestamp.toDate())
    : '';

  function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
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
          <Image source={{ uri: message.imageURL }} style={styles.attachedImage} resizeMode="cover" />
        )}
        {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
      </View>

      {onReply && (
        <TouchableOpacity style={styles.replyBtn} onPress={() => onReply(message)}>
          <Ionicons name="return-down-forward-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.replyText}>Reply</Text>
        </TouchableOpacity>
      )}

      {/* Nested replies */}
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
