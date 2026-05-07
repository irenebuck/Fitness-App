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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, arrayUnion } from 'firebase/firestore';
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

/**
 CreateChallengeScreen
 
 Allows the logged-in user to create a new challenge.
 Collects title, goal, and participants, then saves to the Firestore DB.
 Then navigates back to Home on success.

 */

export default function CreateChallengeScreen() {
  const navigation = useNavigation();
  const { user, userProfile, updateUserProfile } = useAuth();

  // Each useState creates a Variable and a setter for that variable. 

  const [selectedType, setSelectedType] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [checkInGoal, setCheckInGoal] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  // Goals starts as array of 3 goals (Max)
  const [goals, setGoals] = useState(['', '', '']);
  const [selectedBadge, setSelectedBadge] = useState('completion');
  const [isPublic, setIsPublic] = useState(true);
  const [imageUri, setImageUri] = useState(null);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Loading is used while the connection to the DB is made  = True, when it's completed  = False 

  const [loading, setLoading] = useState(false);


  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function uploadImage(uri) {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `challenges/${user.uid}_${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  }

  function updateGoal(text, idx) {
    const updated = [...goals];
    updated[idx] = text;
    setGoals(updated);
  }

  function parseTags(input) {
    return input
      .split(/[,\s#]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }


    // handles alerts cross platform (the outlier is Web)
  function showError(title, message, buttons) {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      if (buttons?.[0]?.onPress) buttons[0].onPress();
    } else {
      Alert.alert(title, message, buttons);
    }
  }

    // Submitting the form to the DB 

  async function handleCreate() {
    if (!title.trim()) {
      return showError('Error', 'Please enter a challenge title.');
    }
    if (!selectedType) {
      return showError('Error', 'Please select a challenge type.');
    }
    if (!startDate.trim() || !endDate.trim()) {
      return showError('Error', 'Please enter start and end dates (MM/DD/YYYY).');
    }

    const validGoals = goals.filter((g) => g.trim());
    if (validGoals.length === 0) {
      return showError('Error', 'Add at least one goal.');
    }

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
        checkInGoal: parseInt(checkInGoal, 10) || 0,
        tags: parseTags(tagsInput),
        goals: validGoals,
        badgeId: selectedBadge,
        isPublic,
        imageURL,
        creatorId: user.uid,
        creatorName: userProfile?.displayName || user.displayName,
        participants: [user.uid],
        participantCount: 1,
        favoriteCount: 0,
        checkIns: { [user.uid]: 0 },
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'challenges'), newChallenge);

      // Add to user's joined challenges
      await updateUserProfile({
        joinedChallenges: arrayUnion(docRef.id),
      });

      showError('Challenge Created!', `"${title.trim()}" is live. Good luck!`, [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } catch (err) {
      console.error('Create challenge error:', err);
      showError('Error', 'Failed to create challenge. Please try again.');
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

      {/* Goals - map is looping over the 3 entries of goals  */}
      <Text style={styles.label}>Goals * (up to 3)</Text>
      {goals.map((goal, idx) => (
        <View key={idx} style={styles.goalRow}>
          <View style={styles.goalBullet}><Text style={styles.goalNumber}>{idx + 1}</Text></View>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder={`Goal ${idx + 1}`}
            placeholderTextColor={COLORS.textSecondary}
            value={goal}
            onChangeText={(text) => updateGoal(text, idx)}
          />
        </View>
      ))}

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
