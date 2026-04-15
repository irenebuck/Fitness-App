import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import BadgeIcon from '../components/BadgeIcon';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function CompletedChallengeScreen() {
  const route = useRoute();
  const { challengeId } = route.params;
  const { user, userProfile } = useAuth();

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenge();
  }, [challengeId]);

  async function loadChallenge() {
    try {
      const snap = await getDoc(doc(db, 'challenges', challengeId));
      if (snap.exists()) {
        setChallenge({ id: snap.id, ...snap.data() });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Challenge not found.</Text>
      </View>
    );
  }

  const myCheckIns = challenge.checkIns?.[user?.uid] || 0;

  // Find beast (most check-ins)
  const checkInsMap = challenge.checkIns || {};
  const beastEntry = Object.entries(checkInsMap).sort(([, a], [, b]) => b - a)[0];
  const beastUid = beastEntry?.[0];
  const isBeast = beastUid === user?.uid;

  const wallOfFame = challenge.wallOfFame || [];
  const earnedBadge = userProfile?.badges?.includes(challenge.badgeId || 'completion');

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={styles.hero}>
        {challenge.imageURL ? (
          <Image source={{ uri: challenge.imageURL }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroEmoji}>{challenge.typeEmoji || '💪'}</Text>
          </View>
        )}
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle} numberOfLines={2}>{challenge.title}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Completed Button (non-interactive) */}
        <View style={styles.completedBadgeBtn}>
          <Ionicons name="lock-closed" size={20} color={COLORS.textSecondary} />
          <Text style={styles.completedBadgeBtnText}>Completed & Closed</Text>
        </View>

        {/* Dates & Stats */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
            <View>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>{challenge.startDate} – {challenge.endDate}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-done-circle-outline" size={18} color={COLORS.primary} />
            <View>
              <Text style={styles.infoLabel}>Your Check-Ins</Text>
              <Text style={styles.infoValue}>{myCheckIns} total</Text>
            </View>
          </View>
          {challenge.checkInGoal > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="trophy-outline" size={18} color={COLORS.primary} />
              <View>
                <Text style={styles.infoLabel}>Check-In Goal</Text>
                <Text style={styles.infoValue}>{challenge.checkInGoal}× per week</Text>
              </View>
            </View>
          )}
        </View>

        {/* Goals */}
        {challenge.goals?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Goals</Text>
            {challenge.goals.map((goal, i) => (
              <View key={i} style={styles.goalItem}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.green} />
                <Text style={styles.goalText}>{goal}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Challenge Beast */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👑 Challenge Beast</Text>
          <View style={styles.beastCard}>
            {isBeast ? (
              <>
                <BadgeIcon type="beast" size="large" />
                <Text style={styles.beastText}>That's you! {myCheckIns} check-ins!</Text>
              </>
            ) : (
              <>
                <BadgeIcon type="beast" size="medium" />
                <Text style={styles.beastText}>
                  The beast logged {beastEntry?.[1] || 0} check-ins.{'\n'}
                  You logged {myCheckIns}.
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Wall of Fame */}
        {wallOfFame.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Wall of Fame</Text>
            <Text style={styles.wofSubtitle}>Participants who completed all goals:</Text>
            {wallOfFame.map((entry, i) => (
              <View key={i} style={styles.wofRow}>
                <View style={styles.wofAvatar}>
                  <Text style={styles.wofAvatarText}>{(entry.name || 'U')[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.wofName}>{entry.name || 'Anonymous'}</Text>
                {entry.uid === user?.uid && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>You!</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Badge Earned */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Badge</Text>
          <View style={styles.badgeCard}>
            <BadgeIcon type={challenge.badgeId || 'completion'} size="large" />
            <Text style={styles.badgeStatus}>
              {earnedBadge ? '✅ Badge Earned!' : 'Complete all goals to earn this badge'}
            </Text>
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.textSecondary, fontSize: SIZES.medium },
  hero: { height: 180, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center', justifyContent: 'center',
  },
  heroEmoji: { fontSize: 72 },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', padding: SPACING.md,
  },
  heroTitle: { color: COLORS.white, fontSize: SIZES.xlarge, fontWeight: '800' },
  content: { padding: SPACING.lg },
  completedBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  completedBadgeBtnText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.large,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
    ...SHADOW.small,
    marginBottom: SPACING.lg,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  infoLabel: {
    fontSize: SIZES.xsmall, color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600',
  },
  infoValue: { fontSize: SIZES.medium, color: COLORS.textPrimary, fontWeight: '500', marginTop: 2 },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: SIZES.large, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  goalItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  goalText: { flex: 1, fontSize: SIZES.medium, color: COLORS.textPrimary },
  beastCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOW.small,
  },
  beastText: {
    fontSize: SIZES.medium, color: COLORS.textPrimary, textAlign: 'center', lineHeight: 22,
  },
  wofSubtitle: { fontSize: SIZES.small, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  wofRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.small,
  },
  wofAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  wofAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: SIZES.medium },
  wofName: { flex: 1, fontSize: SIZES.medium, color: COLORS.textPrimary, fontWeight: '500' },
  youBadge: {
    backgroundColor: COLORS.lightBlue, borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  youBadgeText: { color: COLORS.primary, fontWeight: '700', fontSize: SIZES.xsmall },
  badgeCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.md, ...SHADOW.small,
  },
  badgeStatus: { fontSize: SIZES.medium, color: COLORS.textSecondary, textAlign: 'center' },
});
