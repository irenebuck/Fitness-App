import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase/config';
import BadgeIcon from '../components/BadgeIcon';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';
import SimpleChat from '../components/SimpleChat';

export default function ActiveChallengeScreen() {
  const route = useRoute();
  const { challengeId } = route.params;
  const { user, userProfile, updateUserProfile } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [completedGoals, setCompletedGoals] = useState([]);

  const myCheckIns = challenge?.checkIns?.[user?.uid] || 0;
  const daysLeft = challenge?.endDate
    ? Math.max(0, Math.ceil((new Date(challenge.endDate) - new Date()) / 86400000))
    : null;

  useEffect(() => {
    loadChallenge();
  }, [challengeId]);

  async function loadChallenge() {
    try {
      const snap = await getDoc(doc(db, 'challenges', challengeId));
      if (snap.exists()) {
        setChallenge({ id: snap.id, ...snap.data() });
      }
      // Load user's completed goals for this challenge
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        setCompletedGoals(data.completedGoals?.[challengeId] || []);
      }
    } catch (err) {
      console.error('Load active challenge error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    setCheckingIn(true);
    try {
      await updateDoc(doc(db, 'challenges', challengeId), {
        [`checkIns.${user.uid}`]: increment(1),
      });
      setChallenge((prev) => ({
        ...prev,
        checkIns: { ...(prev.checkIns || {}), [user.uid]: myCheckIns + 1 },
      }));
      Alert.alert('Checked In! 💪', `Total check-ins: ${myCheckIns + 1}`);
    } catch (err) {
      Alert.alert('Error', 'Could not check in. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  }

  async function toggleGoal(goalIndex) {
    let updated;
    if (completedGoals.includes(goalIndex)) {
      updated = completedGoals.filter((i) => i !== goalIndex);
    } else {
      updated = [...completedGoals, goalIndex];
    }
    setCompletedGoals(updated);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [`completedGoals.${challengeId}`]: updated,
      });

      // Check if all goals completed
      if (challenge?.goals && updated.length === challenge.goals.length) {
        await handleChallengeComplete();
      }
    } catch (err) {
      console.error('Toggle goal error:', err);
    }
  }

  async function handleChallengeComplete() {
    Alert.alert(
      '🎉 Challenge Complete!',
      `You completed "${challenge.title}"! You've earned a badge and made it to the Wall of Fame!`,
      [{ text: 'Awesome!' }]
    );
    try {
      // Add badge to user
      await updateUserProfile({
        badges: [...(userProfile?.badges || []), challenge.badgeId || 'completion'],
        completedChallenges: [...(userProfile?.completedChallenges || []), challengeId],
      });
      // Mark user as wall-of-famer for this challenge
      await updateDoc(doc(db, 'challenges', challengeId), {
        wallOfFame: [...((challenge.wallOfFame || [])), { uid: user.uid, name: userProfile?.displayName }],
      });
    } catch (err) {
      console.error('Completion error:', err);
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

  const goalsCompleted = completedGoals.length;
  const totalGoals = challenge.goals?.length || 0;
  const progressPct = totalGoals > 0 ? goalsCompleted / totalGoals : 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false}>
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
            {/* Check-In Button */}
            <TouchableOpacity
              style={[styles.checkInBtn, checkingIn && { opacity: 0.6 }]}
              onPress={handleCheckIn}
              disabled={checkingIn}
            >
              {checkingIn ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-done-circle" size={24} color={COLORS.white} />
                  <Text style={styles.checkInText}>Check In for Workout</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{myCheckIns}</Text>
                <Text style={styles.statLabel}>My Check-Ins</Text>
              </View>
              {challenge.checkInGoal > 0 && (
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{challenge.checkInGoal}×/wk</Text>
                  <Text style={styles.statLabel}>Goal</Text>
                </View>
              )}
              {daysLeft !== null && (
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{daysLeft}</Text>
                  <Text style={styles.statLabel}>Days Left</Text>
                </View>
              )}
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{challenge.participants?.length || 0}</Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>
            </View>

            {/* Dates */}
            <Text style={styles.dateText}>
              {challenge.startDate} – {challenge.endDate}
            </Text>

            {/* Goal Progress */}
            {totalGoals > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Goals</Text>
                  <Text style={styles.progressLabel}>{goalsCompleted}/{totalGoals} Complete</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
                </View>
                {challenge.goals.map((goal, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.goalRow}
                    onPress={() => toggleGoal(idx)}
                  >
                    <Ionicons
                      name={completedGoals.includes(idx) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={completedGoals.includes(idx) ? COLORS.green : COLORS.border}
                    />
                    <Text style={[
                      styles.goalText,
                      completedGoals.includes(idx) && styles.goalDone,
                    ]}>
                      {goal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.chatSection}>
              <Text style={styles.sectionTitle}>Challenge Chat</Text>
              <View style={styles.chatWrap}>
                <SimpleChat challengeId={challengeId} />
              </View>
            </View>

            <View style={{ height: 80 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  checkInBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOW.medium,
  },
  checkInText: { color: COLORS.white, fontSize: SIZES.large, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOW.small,
  },
  statNumber: { fontSize: SIZES.large, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: SIZES.xsmall, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
  dateText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.small,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  section: { marginBottom: SPACING.xl },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontSize: SIZES.large, fontWeight: '700', color: COLORS.textPrimary },
  progressLabel: { fontSize: SIZES.small, color: COLORS.primary, fontWeight: '600' },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 3,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  goalText: { flex: 1, fontSize: SIZES.medium, color: COLORS.textPrimary },
  goalDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  emptyChatBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  
});
