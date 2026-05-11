import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// Lets a user pick an image from their camera roll
import * as ImagePicker from 'expo-image-picker';
// addDoc adds new doc to Firestore DB collection with a new auto-generated ID
// arrayUnion - Firestore helper that adds a value to the end of joinedChallenges, like .push()
import { collection, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase/config';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

const CHALLENGE_TYPES = [
  { key: 'couch_to_5k', label: 'Couch to 5K', emoji: '🏃' },
  { key: '21_days_habit', label: '21 Days to a Habit', emoji: '📅' },
  { key: 'strength', label: 'Strength Training', emoji: '🏋️' },
  { key: 'yoga', label: 'Yoga & Flexibility', emoji: '🧘' },
  { key: 'cycling', label: 'Cycling', emoji: '🚴' },
  { key: 'swimming', label: 'Swimming', emoji: '🏊' },
  { key: 'walking', label: 'Daily Walking', emoji: '🚶' },
  { key: 'hiit', label: 'HIIT Workouts', emoji: '⚡' },
  { key: 'custom', label: 'Custom Challenge', emoji: '✨' },
];

const BADGE_OPTIONS = [
  { key: 'completion', label: 'Completion', emoji: '🏅' },
  { key: 'beast', label: 'Beast Mode', emoji: '👑' },
  { key: 'streak3', label: '3-Day Streak', emoji: '🔥' },
  { key: 'social', label: 'Social Butterfly', emoji: '🤝' },
];

export default function CreateChallengeScreen() {
  const navigation = useNavigation();
  const { user, userProfile, updateUserProfile } = useAuth();

  // Syntax - const [value, setValue] = useState(startingValue)
  // value - what you read to know what is in the field
  // setValue - the function you call to set/change the value
  // startingValue - what field contains when screen first opens
  const [selectedType, setSelectedType] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // No data picker used, user must enter MM/DD/YYYY manually for start and end dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Initially stored as a string, converted to a number in handleCreate using parseInt()
  const [checkInGoal, setCheckInGoal] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [goals, setGoals] = useState(['']);
  const [selectedBadge, setSelectedBadge] = useState('completion');
  const [isPublic, setIsPublic] = useState(true);
  // The local file path of the image the user picked from their camera roll
  // Upload to Firebase storage happens at submit time, not when user selects image
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      // Videos not allowed, photos only
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      // Compresses to 70% quality
      quality: 0.7,
    });
    // If the user picks a photo and doesn't cancel, saves the local file path to imageUri state.
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function uploadImage(uri) {
    const response = await fetch(uri);
    // blob stands for Binary Large Object - raw bytes of image w/o formatting or encoding.
    // .blob() opens and reads raw data in response object. Firebase Storage requires this.
    const blob = await response.blob();
    // Data.now() makes uploading the same image unique for each filename.
    const filename = `challenges/${user.uid}_${Date.now()}.jpg`;
    // Builds address in Firebase Storage, a location pointer.
    const storageRef = ref(storage, filename);
    // The actual uploading to the Firebase Storage address.
    await uploadBytes(storageRef, blob);
    // Returns the internal path so it can be saved to Firestore db
    return getDownloadURL(storageRef);
  }

  function addGoal() {
    // Puts all the existing items into a new array and adds an empty string at the end.
    // The setGoals with new array triggers re-rendering the screen.You never modify state directly,
    // like with .push().  React rule - never mutate state directly so you work on a copy.
    setGoals([...goals, '']);
  }

  function updateGoal(text, idx) {
    const updated = [...goals];
    updated[idx] = text;
    setGoals(updated);
  }

  function removeGoal(idx) {
    if (goals.length === 1) return;
    // creates a new array containing only the items whose index is NOT equal to idx, so 
    // everything except the one being removed.
    setGoals(goals.filter((_, i) => i !== idx));
  }

  function parseTags(input) {
    return input
      // .split(/[,\s#]+/) — splits the string on commas, spaces, or # characters. 
      // The /[,\s#]+/ is a regex — a pattern matcher. \s means any whitespace, + means one 
      // or more of these characters.
      .split(/[,\s#]+/)
      // Trims whitespace and lowercases each tag for consistency.
      .map((t) => t.trim().toLowerCase())
      // Removes empty strings that made it into the clean array
      .filter(Boolean);
  }

  async function handleCreate() {
    // First validates each entry
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a challenge title.');
      return;
    }
    if (!selectedType) {
      Alert.alert('Error', 'Please select a challenge type.');
      return;
    }
    if (!startDate.trim() || !endDate.trim()) {
      Alert.alert('Error', 'Please enter start and end dates (MM/DD/YYYY).');
      return;
    }

    const validGoals = goals.filter((g) => g.trim());
    if (validGoals.length === 0) {
      Alert.alert('Error', 'Add at least one goal.');
      return;
    }

    // Next, sets loading spinner and upload image. Image url in Firebase Storage is needed
    // before the challenge can be built. 
    setLoading(true);
    try {
      let imageURL = null;
      if (imageUri) {
        try {
          imageURL = await uploadImage(imageUri);
        } catch {
          // Non-fatal: proceed without image if upload fails
        }
      }

      const typeInfo = CHALLENGE_TYPES.find((t) => t.key === selectedType);
      const newChallenge = {
        title: title.trim(),
        type: selectedType,
        typeEmoji: typeInfo?.emoji || '💪',
        description: description.trim(),
        startDate,
        endDate,
        // From line 64
        checkInGoal: parseInt(checkInGoal, 10) || 0,
        tags: parseTags(tagsInput),
        goals: validGoals,
        badgeId: selectedBadge,
        isPublic,
        imageURL,
        creatorId: user.uid,
        creatorName: userProfile?.displayName || user.displayName,
        // Creator of challenge automatically joins the challenge.
        participants: [user.uid],
        participantCount: 1,
        favoriteCount: 0,
        checkIns: { [user.uid]: 0 },
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      // Creates the challenge document and returns challenge doc ID
      const docRef = await addDoc(collection(db, 'challenges'), newChallenge);

      // Add to user's joined challenges
      await updateUserProfile({
        joinedChallenges: arrayUnion(docRef.id),
      });

      Alert.alert('Challenge Created!', `"${title.trim()}" is live. Good luck!`, [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } catch (err) {
      console.error('Create challenge error:', err);
      Alert.alert('Error', 'Failed to create challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const selectedTypeInfo = CHALLENGE_TYPES.find((t) => t.key === selectedType);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Challenge Type */}
        <Text style={styles.label}>Challenge Type *</Text>
        <TouchableOpacity style={styles.typeButton} onPress={() => setShowTypePicker(true)}>
          <Text style={styles.typeButtonText}>
            {selectedTypeInfo ? `${selectedTypeInfo.emoji} ${selectedTypeInfo.label}` : 'Select a type…'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.label}>Challenge Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 30-Day Morning Run"
          placeholderTextColor={COLORS.textSecondary}
          value={title}
          onChangeText={setTitle}
          maxLength={60}
        />

        {/* Dates */}
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Start Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={COLORS.textSecondary}
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>End Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={COLORS.textSecondary}
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
        </View>

        {/* Check-in goal */}
        <Text style={styles.label}>Check-In Goal (times per week)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 3"
          placeholderTextColor={COLORS.textSecondary}
          value={checkInGoal}
          onChangeText={setCheckInGoal}
          keyboardType="number-pad"
          maxLength={2}
        />

        {/* Goals */}
        <Text style={styles.label}>Goals *</Text>
        {goals.map((goal, idx) => (
          <View key={idx} style={styles.goalRow}>
            <View style={styles.goalBullet}>
              <Text style={styles.goalNumber}>{idx + 1}</Text>
            </View>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder={`Goal ${idx + 1}`}
              placeholderTextColor={COLORS.textSecondary}
              value={goal}
              onChangeText={(text) => updateGoal(text, idx)}
            />
            {goals.length > 1 && (
              <TouchableOpacity onPress={() => removeGoal(idx)} style={styles.removeGoal}>
                <Ionicons name="close-circle" size={22} color={COLORS.red} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addGoalBtn} onPress={addGoal}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.addGoalText}>Add Goal</Text>
        </TouchableOpacity>

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Describe your challenge, rules, tips…"
          placeholderTextColor={COLORS.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        {/* Tags */}
        <Text style={styles.label}>Tags (comma separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. running, outdoor, beginner"
          placeholderTextColor={COLORS.textSecondary}
          value={tagsInput}
          onChangeText={setTagsInput}
          autoCapitalize="none"
        />

        {/* Image */}
        <Text style={styles.label}>Challenge Image</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={32} color={COLORS.textSecondary} />
              <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Badge */}
        <Text style={styles.label}>Completion Badge</Text>
        <View style={styles.badgeRow}>
          {BADGE_OPTIONS.map((b) => (
            <TouchableOpacity
              key={b.key}
              style={[styles.badgeOption, selectedBadge === b.key && styles.badgeSelected]}
              onPress={() => setSelectedBadge(b.key)}
            >
              <Text style={styles.badgeEmoji}>{b.emoji}</Text>
              <Text style={styles.badgeLabel}>{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Privacy */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Public Challenge</Text>
            <Text style={styles.switchSub}>Anyone can find and join</Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={20} color={COLORS.white} />
              <Text style={styles.submitText}>Launch Challenge</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Type Picker Modal */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Challenge Type</Text>
            <ScrollView>
              {CHALLENGE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.typeItem, selectedType === type.key && styles.typeItemSelected]}
                  onPress={() => {
                    setSelectedType(type.key);
                    if (type.key !== 'custom' && !title) {
                      setTitle(type.label);
                    }
                    setShowTypePicker(false);
                  }}
                >
                  <Text style={styles.typeItemEmoji}>{type.emoji}</Text>
                  <Text style={styles.typeItemLabel}>{type.label}</Text>
                  {selectedType === type.key && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelPicker}
              onPress={() => setShowTypePicker(false)}
            >
              <Text style={styles.cancelPickerText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  label: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.xs,
  },
  multiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  half: {
    flex: 1,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  typeButtonText: {
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  goalBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalNumber: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: SIZES.small,
  },
  removeGoal: {
    padding: SPACING.xs,
  },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  addGoalText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: SIZES.medium,
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    height: 160,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  imagePlaceholderText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.medium,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  badgeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  badgeSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.lightBlue,
  },
  badgeEmoji: {
    fontSize: 18,
  },
  badgeLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchLabel: {
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  switchSub: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    ...SHADOW.medium,
  },
  submitText: {
    color: COLORS.white,
    fontSize: SIZES.large,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xl,
    maxHeight: '75%',
  },
  pickerTitle: {
    fontSize: SIZES.xlarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  typeItemSelected: {
    backgroundColor: COLORS.lightBlue,
  },
  typeItemEmoji: {
    fontSize: 24,
  },
  typeItemLabel: {
    flex: 1,
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  cancelPicker: {
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  cancelPickerText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: SIZES.medium,
  },
});
