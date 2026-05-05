import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import ChallengeCard from '../components/ChallengeCard';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function DiscoveryScreen() {
  const navigation = useNavigation();
  const { user, userProfile, updateUserProfile, refreshUserProfile } = useAuth();

  const [searchTag, setSearchTag] = useState('');
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    setFavorites(userProfile?.favorites || []);
    loadChallenges();
  }, []);

  async function loadChallenges(tag = '') {
    /*
      Gets list of active challenges from the Firebase DB and stores in challenges variable

      @param {string} tag='' - optional variable. Represents a search-by tag to fitler out challenges
      @returns {void} - does not return a value, func finishes executing once state is resolved
    */
    setLoading(true);
    try {
      let q;
      if (tag.trim()) {  // if contains tag, trim the string and search
        q = query(
          collection(db, 'challenges'),
          where('isPublic', '==', true),
          where('status', '==', 'active'),
          where('tags', 'array-contains', tag.trim().toLowerCase()),
          orderBy('participantCount', 'desc'),
          limit(50)
        );
      } else {  // fetch all challenges
        q = query(
          collection(db, 'challenges'),
          where('isPublic', '==', true),
          where('status', '==', 'active'),
          orderBy('participantCount', 'desc'),
          limit(50)
        );
      }
      const snap = await getDocs(q);
      setChallenges(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); // save in, snap.docs = array of matching docs
    } catch (err) {
      console.error('Discovery load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function toggleFavorite(challengeId) {
    /*
      Sets the challenge as a "favorite" in user's favorite list. Updates both backend and UI real-time.

      @param {string} challengeId - ID in Firestore for that specific challenge. ID is 
        from the challenge from loadChallenges(). In Flatlist, this is item.id.
      @returns {void} - does not return a value, func finishes once Firestore finshes the two Awaits
    */
    const isFav = favorites.includes(challengeId);
    const updated = isFav
      ? favorites.filter((id) => id !== challengeId)
      : [...favorites, challengeId];
    setFavorites(updated);

    try {
      await updateUserProfile({
        favorites: isFav ? arrayRemove(challengeId) : arrayUnion(challengeId),
      });
      // Update challenge favoriteCount
      const challengeRef = doc(db, 'challenges', challengeId);
      const snap = await getDoc(challengeRef);
      if (snap.exists()) {
        await updateDoc(challengeRef, {
          favoriteCount: (snap.data().favoriteCount || 0) + (isFav ? -1 : 1),
        });
      }
    } catch (err) {
      console.error('Favorite toggle error:', err);
      // Revert on error
      setFavorites(favorites);
    }
  }

  function handleSearch() {
    loadChallenges(searchTag);
  }

  const displayedChallenges = showFavoritesOnly
    ? challenges.filter((c) => favorites.includes(c.id))
    : challenges;

  // Put favorites at top
  const sorted = [
    ...displayedChallenges.filter((c) => favorites.includes(c.id)),
    ...displayedChallenges.filter((c) => !favorites.includes(c.id)),
  ];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <Ionicons name="pricetag-outline" size={16} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchText}
              placeholder="Search by tag (e.g. running)"
              placeholderTextColor={COLORS.textSecondary}
              value={searchTag}
              onChangeText={setSearchTag}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {searchTag.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchTag(''); loadChallenges(''); }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.favFilter}
          onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          <Ionicons
            name={showFavoritesOnly ? 'star' : 'star-outline'}
            size={18}
            color={showFavoritesOnly ? COLORS.gold : COLORS.textSecondary}
          />
          <Text style={[styles.favFilterText, showFavoritesOnly && { color: COLORS.gold }]}>
            {showFavoritesOnly ? 'Showing Favorites' : 'Show Favorites Only'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyText}>
            {showFavoritesOnly
              ? 'No favorited challenges yet.\nStar some to save them here!'
              : searchTag
              ? `No challenges found for "#${searchTag}"`
              : 'No challenges available right now.'}
          </Text>
          {!showFavoritesOnly && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('CreateChallenge')}
            >
              <Text style={styles.createBtnText}>Create One!</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChallengeCard
              challenge={item}
              isStarred={favorites.includes(item.id)}
              onStar={() => toggleFavorite(item.id)}
              onPress={() => navigation.navigate('ChallengeDetail', { challengeId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadChallenges(searchTag); }}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchText: {
    flex: 1,
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: SIZES.medium,
  },
  favFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  favFilterText: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  list: {
    padding: SPACING.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  createBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: SIZES.medium,
  },
});
