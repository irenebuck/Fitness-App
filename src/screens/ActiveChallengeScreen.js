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
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase/config';
import ChatMessage from '../components/ChatMessage';
import BadgeIcon from '../components/BadgeIcon';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function ActiveChallengeScreen() {
  const route = useRoute();
  const { challengeId } = route.params;
  const { user, userProfile, updateUserProfile } = useAuth();

  const [challenge, setChallenge] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postText, setPostText] = useState('');
  const [postImageUri, setPostImageUri] = useState(null);
  const [posting, setPosting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [completedGoals, setCompletedGoals] = useState([]);

  const myCheckIns = challenge?.checkIns?.[user?.uid] || 0;
  const daysLeft = challenge?.endDate
    ? Math.max(0, Math.ceil((new Date(challenge.endDate) - new Date()) / 86400000))
    : null;

  useEffect(() => {
    loadChallenge();
    // ── DEAD_CODE #3 (legacy chat subscription) ──────────────────────
    // removed for simplicity, kept in comments for potential path forward
    // SimpleChat subscribes to Firestore internally now.
    // const unsubscribe = subscribeToMessages();
    // return unsubscribe;
    // ── END DEAD_CODE #3 ─────────────────────────────────────────────
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

  function subscribeToMessages() {
    const q = query(
      collection(db, 'messages'),
      where('challengeId', '==', challengeId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
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

  // ── DEAD_CODE #5 (legacy image picker + post/reply handler) ────────
  // Replaced by SimpleChat.handleSend() which is text-only, code left commented pending path forward
  // When rich chat returns, port these back as additive features.
  //
  // async function pickPostImage() {
  //   const result = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //     allowsEditing: true,
  //     quality: 0.7,
  //   });
  //   if (!result.canceled && result.assets[0]) {
  //     setPostImageUri(result.assets[0].uri);
  //   }
  // }
  //
  // async function handlePost() {
  //   if (!postText.trim() && !postImageUri) {
  //     Alert.alert('Error', 'Please add a message or photo.');
  //     return;
  //   }
  //   setPosting(true);
  //   try {
  //     let imageURL = null;
  //     if (postImageUri) {
  //       const response = await fetch(postImageUri);
  //       const blob = await response.blob();
  //       const filename = `messages/${user.uid}_${Date.now()}.jpg`;
  //       const storageRef = ref(storage, filename);
  //       await uploadBytes(storageRef, blob);
  //       imageURL = await getDownloadURL(storageRef);
  //     }
  //
  //     if (replyTarget) {
  //       // Add reply to existing message
  //       const msgRef = doc(db, 'messages', replyTarget.id);
  //       const msgSnap = await getDoc(msgRef);
  //       if (msgSnap.exists()) {
  //         const replies = msgSnap.data().replies || [];
  //         await updateDoc(msgRef, {
  //           replies: [
  //             ...replies,
  //             {
  //               id: Date.now().toString(),
  //               userId: user.uid,
  //               userDisplayName: userProfile?.displayName || user.displayName,
  //               userPhotoURL: userProfile?.photoURL || null,
  //               text: postText.trim(),
  //               timestamp: new Date().toISOString(),
  //             },
  //           ],
  //         });
  //       }
  //     } else {
  //       await addDoc(collection(db, 'messages'), {
  //         challengeId,
  //         userId: user.uid,
  //         userDisplayName: userProfile?.displayName || user.displayName,
  //         userPhotoURL: userProfile?.photoURL || null,
  //         text: postText.trim(),
  //         imageURL,
  //         timestamp: serverTimestamp(),
  //         replies: [],
  //       });
  //     }
  //
  //     setPostText('');
  //     setPostImageUri(null);
  //     setReplyTarget(null);
  //     setShowPostModal(false);
  //   } catch (err) {
  //     console.error('Post error:', err);
  //     Alert.alert('Error', 'Could not post message. Please try again.');
  //   } finally {
  //     setPosting(false);
  //   }
  // }
  // ── END DEAD_CODE #5 ───────────────────────────────────────────────

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

            {/* Chat — simplified flat chat (Progress Report #1) */}
            <View style={styles.chatSection}>
              <Text style={styles.sectionTitle}>Challenge Chat</Text>
              <View style={styles.chatWrap}>
                <SimpleChat challengeId={challengeId} />
              </View>
            </View>

            {/* ── DEAD_CODE #6 (legacy chat render block) ───────────── */}
            {/* Kept for reference; delete after SimpleChat is approved. */}
            {/*
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Challenge Chat</Text>
              {messages.length === 0 ? (
                <View style={styles.emptyChatBox}>
                  <Text style={styles.emptyChatText}>
                    No messages yet. Be the first to post!
                  </Text>
                </View>
              ) : (
                messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    currentUserId={user.uid}
                    onReply={(m) => { setReplyTarget(m); setShowPostModal(true); }}
                  />
                ))
              )}
            </View>
            */}
            {/* ── END DEAD_CODE #6 ──────────────────────────────────── */}

            <View style={{ height: 80 }} />
          </View>
        </ScrollView>

        {/* ── DEAD_CODE #7 (legacy FAB) ─────────────────────────────── */}
        {/* SimpleChat uses an inline input row, so no FAB is needed.   */}
        {/*
        <TouchableOpacity
          style={styles.fab}
          onPress={() => { setReplyTarget(null); setShowPostModal(true); }}
        >
          <Ionicons name="add" size={30} color={COLORS.white} />
        </TouchableOpacity>
        */}
        {/* ── END DEAD_CODE #7 ──────────────────────────────────────── */}
      </KeyboardAvoidingView>

      {/* ── DEAD_CODE #8 (legacy post modal) ────────────────────────── */}
      {/* Replaced by SimpleChat's inline TextInput + send button.      */}
      {/*
      <Modal visible={showPostModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.postModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {replyTarget ? `Reply to ${replyTarget.userDisplayName}` : 'Post to Chat'}
              </Text>
              <TouchableOpacity onPress={() => { setShowPostModal(false); setReplyTarget(null); }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {replyTarget && (
              <View style={styles.replyPreview}>
                <Text style={styles.replyPreviewText} numberOfLines={2}>
                  {replyTarget.text}
                </Text>
              </View>
            )}

            <TextInput
              style={styles.postInput}
              placeholder="Share your progress, tips, or encouragement…"
              placeholderTextColor={COLORS.textSecondary}
              value={postText}
              onChangeText={setPostText}
              multiline
              numberOfLines={4}
              maxLength={500}
              autoFocus
            />

            {postImageUri && (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: postImageUri }} style={styles.postImagePreview} />
                <TouchableOpacity
                  style={styles.removeImage}
                  onPress={() => setPostImageUri(null)}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.postActions}>
              {!replyTarget && (
                <TouchableOpacity style={styles.photoBtn} onPress={pickPostImage}>
                  <Ionicons name="image-outline" size={22} color={COLORS.primary} />
                  <Text style={styles.photoBtnText}>Add Photo</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.postBtn, posting && { opacity: 0.6 }]}
                onPress={handlePost}
                disabled={posting}
              >
                {posting ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.postBtnText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      */}
      {/* ── END DEAD_CODE #8 ────────────────────────────────────────── */}
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
  emptyChatText: { color: COLORS.textSecondary, fontSize: SIZES.medium },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  postModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: SIZES.large, fontWeight: '700', color: COLORS.textPrimary },
  replyPreview: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  replyPreviewText: { color: COLORS.textSecondary, fontSize: SIZES.small },
  postInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  imagePreviewWrap: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  postImagePreview: {
    width: '100%',
    height: 160,
    borderRadius: RADIUS.sm,
    resizeMode: 'cover',
  },
  removeImage: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  photoBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: SIZES.medium },
  postBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  postBtnText: { color: COLORS.white, fontWeight: '700', fontSize: SIZES.medium },
});
