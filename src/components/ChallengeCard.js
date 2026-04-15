import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function ChallengeCard({ challenge, onPress, onStar, isStarred, compact }) {
  const participantCount = challenge.participants?.length ?? 0;
  const daysLeft = challenge.endDate
    ? Math.max(0, Math.ceil((new Date(challenge.endDate) - new Date()) / 86400000))
    : null;

  if (compact) {
    return (
      <TouchableOpacity style={styles.compact} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.compactImage}>
          {challenge.imageURL ? (
            <Image source={{ uri: challenge.imageURL }} style={styles.compactImg} />
          ) : (
            <Text style={styles.compactEmoji}>{challenge.typeEmoji || '🏃'}</Text>
          )}
        </View>
        <Text style={styles.compactTitle} numberOfLines={2}>
          {challenge.title}
        </Text>
        {daysLeft !== null && (
          <Text style={styles.compactDays}>{daysLeft}d left</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        {onStar && (
          <TouchableOpacity onPress={onStar} style={styles.star}>
            <Ionicons
              name={isStarred ? 'star' : 'star-outline'}
              size={22}
              color={isStarred ? COLORS.gold : COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
        {challenge.imageURL ? (
          <Image source={{ uri: challenge.imageURL }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderEmoji}>{challenge.typeEmoji || '🏃'}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{challenge.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.meta}>{participantCount} joined</Text>
            {daysLeft !== null && (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.meta}>{daysLeft}d left</Text>
              </>
            )}
          </View>
          {challenge.tags?.length > 0 && (
            <View style={styles.tags}>
              {challenge.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.small,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  star: {
    padding: SPACING.xs,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.border,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  dot: {
    color: COLORS.textSecondary,
    fontSize: SIZES.small,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: RADIUS.round,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: SIZES.xsmall,
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Compact style for home screen horizontal scroll
  compact: {
    width: 120,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginRight: SPACING.sm,
    alignItems: 'center',
    ...SHADOW.small,
  },
  compactImage: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  compactImg: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
  },
  compactEmoji: {
    fontSize: 30,
  },
  compactTitle: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  compactDays: {
    fontSize: SIZES.xsmall,
    color: COLORS.primary,
    marginTop: 2,
  },
});
