import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import BadgeIcon from '../components/BadgeIcon';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function ChallengeDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { challengeId } = route.params;
  const { user, userProfile, updateUserProfile } = useAuth();

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const alreadyJoined = userProfile?.joinedChallenges?.includes(challengeId);

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
      console.error('Load challenge error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (alreadyJoined) {
      navigation.navigate('ActiveChallenge', { challengeId });
      return;
    }

    setJoining(true);
    try {
      const challengeRef = doc(db, 'challenges', challengeId);
      await updateDoc(challengeRef, {
        participants: arrayUnion(user.uid),
        participantCount: increment(1),
        [`checkIns.${user.uid}`]: 0,
      });

      await updateUserProfile({
        joinedChallenges: arrayUnion(challengeId),
      });

      Alert.alert(
        "You're In! 🎉",
        `Welcome to "${challenge.title}". Good luck!`,
        [{ text: "Let's Go!", onPress: () => navigation.navigate('ActiveChallenge', { challengeId }) }]
      );
    } catch (err) {
      console.error('Join error:', err);
      Alert.alert('Error', 'Could not join the challenge. Please try again.');
    } finally {
      setJoining(false);
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

  const daysLeft = challenge.endDate
    ? Math.max(0, Math.ceil((new Date(challenge.endDate) - new Date()) / 86400000))
    : null;

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Hero image */}
      <View style={styles.hero}>
        {challenge.imageURL ? (
          <Image source={{ uri: challenge.imageURL }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroEmoji}>{challenge.typeEmoji || '💪'}</Text>
          </View>
        )}
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>{challenge.title}</Text>
          <View style={styles.heroMeta}>
            <Ionicons name="people" size={16} color={COLORS.white} />
            <Text style={styles.heroMetaText}>{challenge.participantCount || 0} participants</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Join Button */}
        <TouchableOpacity
          style={[styles.joinBtn, alreadyJoined && styles.joinedBtn, joining && { opacity: 0.6 }]}
          onPress={handleJoin}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons
                name={alreadyJoined ? 'checkmark-circle' : 'enter-outline'}
                size={22}
                color={COLORS.white}
              />
              <Text style={styles.joinBtnText}>
                {alreadyJoined ? 'View Active Challenge' : 'Join Challenge'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Dates */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
            <View>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>
                {challenge.startDate} – {challenge.endDate}
              </Text>
            </View>
          </View>
          {daysLeft !== null && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={COLORS.primary} />
              <View>
                <Text style={styles.infoLabel}>Time Remaining</Text>
                <Text style={styles.infoValue}>{daysLeft} days left</Text>
              </View>
            </View>
          )}
          {challenge.checkInGoal > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.primary} />
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
                <View style={styles.goalBullet}>
                  <Text style={styles.goalNum}>{i + 1}</Text>
                </View>
                <Text style={styles.goalText}>{goal}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        {challenge.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{challenge.description}</Text>
          </View>
        ) : null}

        {/* Tags */}
        {challenge.tags?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsRow}>
              {challenge.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Badge */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completion Badge</Text>
          <View style={styles.badgeRow}>
            <BadgeIcon type={challenge.badgeId || 'completion'} size="large" />
            <Text style={styles.badgeCaption}>
              Complete all goals and earn this badge!
            </Text>
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.medium,
  },
  hero: {
    height: 220,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 80,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: SPACING.lg,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: SIZES.xxlarge,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: SIZES.small,
  },
  content: {
    padding: SPACING.lg,
  },
  joinBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOW.medium,
    marginBottom: SPACING.lg,
  },
  joinedBtn: {
    backgroundColor: COLORS.green,
  },
  joinBtnText: {
    color: COLORS.white,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  infoLabel: {
    fontSize: SIZES.xsmall,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: SIZES.large,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  goalBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  goalNum: {
    color: COLORS.white,
    fontSize: SIZES.xsmall,
    fontWeight: '700',
  },
  goalText: {
    flex: 1,
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  description: {
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
    lineHeight: 22,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOW.small,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  tagText: {
    color: COLORS.primary,
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  badgeRow: {
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    ...SHADOW.small,
  },
  badgeCaption: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
