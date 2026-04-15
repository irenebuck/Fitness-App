import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { storage, auth } from '../firebase/config';
import BadgeIcon from '../components/BadgeIcon';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, userProfile, updateUserProfile, changePassword, deleteAccount, logout } = useAuth();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [allowReplies, setAllowReplies] = useState(userProfile?.allowReplies !== false);
  const [showOnline, setShowOnline] = useState(userProfile?.showOnline !== false);
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const badges = userProfile?.badges || [];
  const joinedCount = userProfile?.joinedChallenges?.length || 0;
  const completedCount = userProfile?.completedChallenges?.length || 0;

  async function pickAndUploadPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `avatars/${user.uid}.jpg`);
      await uploadBytes(storageRef, blob);
      const photoURL = await getDownloadURL(storageRef);
      await updateUserProfile({ photoURL });
      await updateProfile(user, { photoURL });
    } catch (err) {
      Alert.alert('Error', 'Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function saveName() {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty.');
      return;
    }
    setSavingName(true);
    try {
      await updateUserProfile({ displayName: displayName.trim() });
      Alert.alert('Saved', 'Your display name has been updated.');
    } catch (err) {
      Alert.alert('Error', 'Could not save name. Please try again.');
    } finally {
setSavingName(false);
    }
  }

  async function saveSettings() {
    try {
      await updateUserProfile({ allowReplies, showOnline });
      Alert.alert('Settings Saved');
    } catch (err) {
      Alert.alert('Error', 'Could not save settings.');
    }
  }

  async function handleChangePassword() {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in both fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(newPassword);
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (err) {
      Alert.alert('Error', 'Could not change password. You may need to log in again first.');
    } finally {
      setPasswordLoading(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch (err) {
              Alert.alert('Error', 'Could not delete account. You may need to log in again first.');
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrap}>
          {uploadingPhoto ? (
            <View style={styles.avatarLoading}>
              <ActivityIndicator color={COLORS.white} />
            </View>
          ) : userProfile?.photoURL ? (
            <Image source={{ uri: userProfile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {(userProfile?.displayName || 'U')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.cameraBtn} onPress={pickAndUploadPhoto}>
            <Ionicons name="camera" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.profileName}>{userProfile?.displayName}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{joinedCount}</Text>
          <Text style={styles.statLabel}>Joined</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{badges.length}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Display Name */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Display Name</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your display name"
              placeholderTextColor={COLORS.textSecondary}
              maxLength={40}
            />
            <TouchableOpacity
              style={[styles.saveBtn, savingName && { opacity: 0.6 }]}
              onPress={saveName}
              disabled={savingName}
            >
              {savingName ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Badges */}
        {badges.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Badges</Text>
            <View style={styles.badgesRow}>
              {badges.map((badge, i) => (
                <BadgeIcon key={i} type={badge} size="medium" />
              ))}
            </View>
          </View>
        )}

        {/* Privacy Options */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacy Options</Text>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Allow Replies</Text>
              <Text style={styles.switchSub}>Others can reply to your chat posts</Text>
            </View>
            <Switch
              value={allowReplies}
              onValueChange={setAllowReplies}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Show Online Status</Text>
              <Text style={styles.switchSub}>Others can see when you're active</Text>
            </View>
            <Switch
              value={showOnline}
              onValueChange={setShowOnline}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
          <TouchableOpacity style={styles.optionSaveBtn} onPress={saveSettings}>
            <Text style={styles.optionSaveBtnText}>Save Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setShowPasswordModal(true)}
          >
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
            <Text style={styles.actionText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
            <Text style={[styles.actionText, { color: COLORS.red }]}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={confirmDeleteAccount}>
            <Ionicons name="trash-outline" size={20} color={COLORS.red} />
            <Text style={[styles.actionText, { color: COLORS.red }]}>Delete Account & Data</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </View>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor={COLORS.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.saveBtn, passwordLoading && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveBtnText}>Change Password</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  avatarSection: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  avatarWrap: { position: 'relative', marginBottom: SPACING.sm },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.white },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: COLORS.white,
  },
  avatarLoading: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: SIZES.xxxlarge, fontWeight: '700' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
  profileName: { color: COLORS.white, fontSize: SIZES.xlarge, fontWeight: '700' },
  profileEmail: { color: 'rgba(255,255,255,0.8)', fontSize: SIZES.medium },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.lg,
    ...SHADOW.small,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: SIZES.xxlarge, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: SIZES.xsmall, color: COLORS.textSecondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  content: { padding: SPACING.lg },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOW.small,
  },
  cardTitle: {
    fontSize: SIZES.medium,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  inputRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.md,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: SIZES.medium },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  switchLabel: { fontSize: SIZES.medium, fontWeight: '500', color: COLORS.textPrimary },
  switchSub: { fontSize: SIZES.xsmall, color: COLORS.textSecondary, marginTop: 2 },
  optionSaveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  optionSaveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: SIZES.medium },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: { flex: 1, fontSize: SIZES.medium, color: COLORS.textPrimary, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xl,
  },
  modalTitle: { fontSize: SIZES.xlarge, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.lg },
  label: {
    fontSize: SIZES.small, fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  cancelBtn: { padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: SIZES.medium },
});
