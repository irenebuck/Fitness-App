import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, SIZES, RADIUS } from '../theme';

const BADGE_DATA = {
  completion: { emoji: '🏅', label: 'Completed', color: '#4A90D9' },
  beast: { emoji: '👑', label: 'Beast', color: '#FF6B35' },
  streak3: { emoji: '🔥', label: '3-Day Streak', color: '#FF3B30' },
  social: { emoji: '🤝', label: 'Social', color: '#34C759' },
  creator: { emoji: '✨', label: 'Creator', color: '#AF52DE' },
  firstchallenge: { emoji: '⭐', label: 'First Challenge', color: '#FFD700' },
  default: { emoji: '🎖️', label: 'Badge', color: '#8E8E93' },
};

export default function BadgeIcon({ type = 'default', size = 'medium', showLabel = true }) {
  const badge = BADGE_DATA[type] || BADGE_DATA.default;
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  const circleSize = isLarge ? 72 : isSmall ? 40 : 56;
  const emojiSize = isLarge ? 32 : isSmall ? 18 : 24;
  const labelSize = isLarge ? SIZES.medium : isSmall ? SIZES.xsmall : SIZES.small;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: badge.color + '20',
            borderColor: badge.color,
          },
        ]}
      >
        <Text style={{ fontSize: emojiSize }}>{badge.emoji}</Text>
      </View>
      {showLabel && (
        <Text style={[styles.label, { fontSize: labelSize, color: badge.color }]}>
          {badge.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  circle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
