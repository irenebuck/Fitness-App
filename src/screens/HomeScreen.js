import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// useFocusEffect rerenders every time you return to Home Screen for most current version of challenges, etc.
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import ChallengeCard from '../components/ChallengeCard';
import BadgeIcon from '../components/BadgeIcon';
import HamburgerMenu from '../components/HamburgerMenu';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function HomeScreen() {
  const navigation = useNavigation();
  // useAuth is a custom-built hook in AuthContext.js
  // It pulls from Firebase the auth'd user, the user's profile/details, and a function to refresh the profile
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // This causes a refresh whenever a user returns to the Home Screen AND something in userProfile changes
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [userProfile])
  );

  async function loadData() {
    // If the userProfile hasn't loaded from Firebase yet, stop
    if (!userProfile) return;
    try {
      // || [] means if the field doesn't exist, use an empty array instead of crashing. 
      const joined = userProfile.joinedChallenges || [];
      const completed = userProfile.completedChallenges || [];
      // Filters out completed challenges IDs from all challenge IDs the user is in.
      const activeIds = joined.filter((id) => !completed.includes(id));

      // Fetches active and completed challenges simultaneously using the IDs
      const [activeData, completedData] = await Promise.all([
        fetchChallenges(activeIds),
        fetchChallenges(completed),
      ]);
      // Updates variables. If something changed, this update triggers re-rendering
      setActiveChallenges(activeData);
      setCompletedChallenges(completedData);
    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      // Turns off loading spinners
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchChallenges(ids) {
    // Takes an array of challenge IDs and returns an array of challenge objects
    if (!ids || ids.length === 0) return [];
    const results = [];
    // Gets a complete list of challenge Ids and reverses them from newest to oldest
    const mostRecentIds = [...ids].reverse()
    // Takes the first/newest 10 challenges, no need to make Firestore request for more than 10
    for (const id of mostRecentIds.slice(0, 10)) {
      // snapshot of the challenge document from Firestore
      const snap = await getDoc(doc(db, 'challenges', id));
      // if document found, create object with all field data and add it to results array
      if (snap.exists()) results.push({ id: snap.id, ...snap.data() });
    }
    return results;
  }

  // Called when a user pulls the screen down
  // Spinner animation activates, fetches Firestore profile, and reloads data
  async function onRefresh() {
    setRefreshing(true);
    try {
      await refreshUserProfile();
      await loadData();
    } catch (err) {
      console.error('Refresh failed:', err);
      setRefreshing(false)
    }
  }

  // Friend only appears if there is an issue reading the profile from Firebase
  const displayName = userProfile?.displayName || user?.displayName || 'Friend';
  const badges = userProfile?.badges || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.avatarWrap}
          >
            {userProfile?.photoURL ? (
              <Image source={{ uri: userProfile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{displayName} 👋</Text>
          </View>
        </View>
        <HamburgerMenu />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('CreateChallenge')}
            >
              <Ionicons name="add-circle" size={22} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('Discovery')}
            >
              <Ionicons name="search" size={22} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Discover</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('MessageCenter')}
            >
              <Ionicons name="chatbubbles" size={22} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Messages</Text>
            </TouchableOpacity>
          </View>

          {/* Active Challenges */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Challenges</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Discovery')}>
                <Text style={styles.seeAll}>+ Join more</Text>
              </TouchableOpacity>
            </View>
            {activeChallenges.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🏋️</Text>
                <Text style={styles.emptyText}>No active challenges yet</Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('Discovery')}
                >
                  <Text style={styles.emptyButtonText}>Find a Challenge</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Sideways-scrolling list of challenge card
              <FlatList
                data={activeChallenges}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <ChallengeCard
                    challenge={item}
                    compact
                    onPress={() => navigation.navigate('ActiveChallenge', { challengeId: item.id })}
                  />
                )}
                contentContainerStyle={styles.horizontalList}
              />
            )}
          </View>

          {/* Completed Challenges */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed Challenges</Text>
            {completedChallenges.length === 0 ? (
              <Text style={styles.emptySubText}>Complete challenges to see them here</Text>
            ) : (
              <FlatList
                data={completedChallenges}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <ChallengeCard
                    challenge={item}
                    compact
                    onPress={() =>
                      navigation.navigate('CompletedChallenge', { challengeId: item.id })
                    }
                  />
                )}
                contentContainerStyle={styles.horizontalList}
              />
            )}
          </View>

          {/* Badges Footer */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Badges</Text>
            {badges.length === 0 ? (
              <Text style={styles.emptySubText}>Complete challenges to earn badges!</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.badgesRow}>
                  {badges.map((badge, i) => (
                    <BadgeIcon key={i} type={badge} size="medium" />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarWrap: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: SIZES.large,
  },
  greeting: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: SIZES.small,
  },
  name: {
    color: COLORS.white,
    fontSize: SIZES.large,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.lightBlue,
  },
  quickBtnText: {
    fontSize: SIZES.xsmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: SIZES.large,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  seeAll: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    fontWeight: '600',
  },
  horizontalList: {
    paddingBottom: SPACING.sm,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOW.small,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: SIZES.medium,
  },
  emptySubText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.medium,
    fontStyle: 'italic',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
});
