import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { collection, addDoc, arrayUnion } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

// Variables from the original general architecture 
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { COLORS, SPACING, SIZES, RADIUS } from '../theme';

/**
  CreateChallengeScreen
  Collects title, goals, description, and dates.
  Saves to Firestore and navigates to Home on success.
 */

export default function CreateChallengeScreen() {
  const navigation = useNavigation();
  const { user, userProfile, updateUserProfile } = useAuth();

  // Each useState creates a Variable and a setter for that variable. 
  // The variables for the Challenge are Title, Goal, Participants and Loading
  const [title, setTitle] = useState('');

  // Goals starts as array of 3 goals (Max)
  const [goals, setGoals] = useState(['', '', '']);

  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Loading is used while the connection to the DB is made  = True, when it's completed  = False 
  const [loading, setLoading] = useState(false);

  // called everytime a user type in the Goals fields to update the array of 3 goals 
  function updateGoal(text, idx) {
    const updated = [...goals];
    updated[idx] = text;
    setGoals(updated);
  }

  //Validating the Date format is correct 
  function isValidDate(dateStr) {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
  }

  // handles alerts cross platform (the outlier is Web)
  function showError(message) {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('Error', message); // ← calls Alert instead
    }
  }

  // Submitting the form to the DB 
  async function handleCreate() {

    // Missing ot not valid values are handled with alerts and cancel 
    if (!title.trim()) return showError('Please enter a title.');
    if (!startDate.trim() || !endDate.trim()) return showError('Please enter start and end dates.');
    if (!isValidDate(startDate) || !isValidDate(endDate)) return showError('Dates must be in MM/DD/YYYY format.');

    // Missing at least 1 goal cancel the operation 
    // Strip empty goals 
    const validGoals = goals.filter((g) => g.trim());
    if (validGoals.length === 0) return showError('Add at least one goal.');

    // Loading while trying to create the object in the Firestore DB
    setLoading(true);
    try {
      // Creating a new doc for the Challenges collection in the Firestore DB with the following variables 
      const docRef = await addDoc(collection(db, 'challenges'), {

        title: title.trim(),
        goals: validGoals,
        description: description.trim(),
        startDate,
        endDate,
        creatorId: user.uid,

        //Assigning the user name as the creator 
        creatorName: userProfile?.displayName || user.displayName,
        //Assigning the user id as the first participants in the challenge 
        participants: [user.uid],
        // Setting the status of the challenge as active (not deleted)
        status: 'active',
        createdAt: new Date().toISOString(),
      });

      // Updating the user profile that created the Challenge with the new Challenge ID (that was assigned to the Docref above by Firestore)
      await updateUserProfile({ joinedChallenges: arrayUnion(docRef.id) });

      // Alerts if the challenge was created without errors
      showError('Challenge Created!', `"${title.trim()}" is live!`, [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } catch (err) {
      // Alerts if there was an error creating the challenge 
      showError('Failed to create challenge.');
    } finally {

      // Setting the loading variable to False (to stop spinning)
      setLoading(false);
    }
  }


  // UI - View 
  return (
    <View style={styles.container}>
    {/* the Form tabs are orgenized in duo of header and text input */}
      <Text style={styles.label}>Title *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Challenge title" placeholderTextColor={COLORS.textSecondary} maxLength={60} />

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
      {/*  */}
      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Describe your challenge…" placeholderTextColor={COLORS.textSecondary} multiline numberOfLines={4} maxLength={500} />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Start Date *</Text>
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="MM/DD/YYYY" placeholderTextColor={COLORS.textSecondary} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>End Date *</Text>
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="MM/DD/YYYY" placeholderTextColor={COLORS.textSecondary} />
        </View>
      </View>

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Create Challenge</Text>}
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.lg, backgroundColor: COLORS.background },
  label: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.xs, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.md, fontSize: SIZES.medium, color: COLORS.textPrimary, backgroundColor: COLORS.white, marginBottom: SPACING.xs },
  multiline: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: SPACING.md },
  half: { flex: 1 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  goalBullet: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  goalNumber: { color: COLORS.white, fontWeight: '700', fontSize: SIZES.small },
  button: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.lg, alignItems: 'center', marginTop: SPACING.xl },
  buttonText: { color: COLORS.white, fontSize: SIZES.large, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
});