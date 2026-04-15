import React, { useEffect, useState, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import ChallengeCard from '../components/ChallengeCard';
import BadgeIcon from '../components/BadgeIcon';
import HamburgerMenu from '../components/HamburgerMenu';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user, userProfile, refreshUserProfile } = useAuth();

  const [activeChallenges, setActiveChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [userProfile])
  );

  async function loadData() {
    if (!userProfile) return;
    try {
      const joined = userProfile.joinedChallenges || [];
      const completed = userProfile.completedChallenges || [];
      const activeIds = joined.filter((id) => !completed.includes(id));

      const [activeData, completedData] = await Promise.all([
        fetchChallenges(activeIds),
        fetchChallenges(completed),
      ]);

      setActiveChallenges(activeData);
      setCompletedChallenges(completedData);
    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchChallenges(ids) {
    if (!ids || ids.length === 0) return [];
    const results = [];
    for (const id of ids.slice(0, 20)) {
      const snap = await getDoc(doc(db, 'challenges', id));
      if (snap.exists()) results.push({ id: snap.id, ...snap.data() });
    }
    return results;
  }

  async function onRefresh() {
    setRefreshing(true);
    await refreshUserProfile();
    await loadData();
  }

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
