import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  // Enables pull-to-refresh on a scrollable list
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  orderBy,
  // Caps how many documents a query returns
  limit,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  // Opposite of arrayUnion, removes a specific value without touching the rest of array
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

  // Syntax - const [value, setValue] = useState(startingValue)
  // value - what you read to know what is in the field
  // setValue - the function you call to set/change the value
  // startingValue - what field contains when screen first opens
  const [searchTag, setSearchTag] = useState('');
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    // Runs once on mount. || [] handles users who have no favorites field yet.
    setFavorites(userProfile?.favorites || []);
    loadChallenges();
  }, []);

  async function loadChallenges(tag = '') {
    setLoading(true);
    try {
      let q;
      if (tag.trim()) {
        // Firestore db query with a tag
        q = query(
          collection(db, 'challenges'),
          where('isPublic', '==', true),
          where('status', '==', 'active'),
          where('tags', 'array-contains', tag.trim().toLowerCase()),
          // Challenges with most members are listed first
          orderBy('participantCount', 'desc'),
          // Fetches no more than 50 challenges
          limit(50)
        );
      } else {
        // Firestore db query without a tag
        q = query(
          collection(db, 'challenges'),
          where('isPublic', '==', true),
          where('status', '==', 'active'),
          orderBy('participantCount', 'desc'), 
          limit(50)
        );
      }
      // Snapshot of point-in-time doc matches bundled in an object
      const snap = await getDocs(q);
      // Opens the snap object and gives the fields, adding docID as an extra field,
      //     and saving the array into state.
      // docID lives outside the document, so adding ID is extra needed step.
      // Now challenges is a JavaScript array the components can read and render.
      setChallenges(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Discovery load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Adds or removes a challenge from the favorites list when the star is clicked in local state
  async function toggleFavorite(challengeId) {
    // favorites is the local state array of challenge IDs user has starred.
    // Checks is the challenge passed to this function is already a favorite.
    const isFav = favorites.includes(challengeId);
    // If already a fav and clicked, remove from favs. Otherwide, add to faves.
    const updated = isFav
      ? favorites.filter((id) => id !== challengeId)
      : [...favorites, challengeId];
    // Saves the new array into local state immediately — before any database 
    // call. This is why the star icon responds the instant you tap it, with no delay.
    setFavorites(updated);

    // Updates the database based on local state for the toggleFavorites
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

  // If the favorites filter is on, only show faves else show every challenge.
  const displayedChallenges = showFavoritesOnly
    ? challenges.filter((c) => favorites.includes(c.id))
    : challenges;

  // Put favorites at top regardless of filtering.
  // No db call needed, just rearranges what is already in memory/local state. 
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
        // Only renders items currently visible on the screen, loading more as you scroll.
        // It improves performance.
        <FlatList
          // array to render
          data={sorted}
          // Tells Flatlist to use item.id for mapping, the challenge ID.
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
            // refreshControl — attaches pull-to-refresh behavior. When the user pulls down, setRefreshing(true) and loadChallenges are called, fetching fresh data
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
