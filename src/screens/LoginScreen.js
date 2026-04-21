import React, { useState } from 'react';
import {
  // <div> equivalent
  View,
  Text,
  TextInput,
  // <button> equivalent
  TouchableOpacity,
  StyleSheet,
  // Popup on top of existing screen
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  // Circular spinning animation
  ActivityIndicator,
} from 'react-native';
// Pads content so iPhone additional bars/notches don't hide content
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function LoginScreen() {
  const { login, signup, resetPassword } = useAuth();

  // Login state
  // Stores the email the user enters in the starting blank '' email field
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Tracks if login request is in progress, spinner displayed when true/in progress
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup modal state
  // Signup modal/popup stays hidden when false
  const [showSignup, setShowSignup] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  // Forgot password modal
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleLogin() {
    // if either field (less/trimmed spaces) is blank, return error
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    // else show spinner while waiting for login approval
    setLoginLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert('Login Failed', friendlyError(err.code));
    } finally {
      setLoginLoading(false);
    }
  }

  // Called when user clicks Create Account on Login Screen
  async function handleSignup() {
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword || !signupConfirm) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (signupPassword !== signupConfirm) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (signupPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setSignupLoading(true);
    try {
      await signup(signupName.trim(), signupEmail.trim(), signupPassword);
      setShowSignup(false);
    } catch (err) {
      Alert.alert('Sign Up Failed', friendlyError(err.code));
    } finally {
      setSignupLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!forgotEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    try {
      await resetPassword(forgotEmail.trim());
      Alert.alert('Email Sent', 'If an account exists for that email, you will receive reset instructions.');
      setShowForgot(false);
      setForgotEmail('');
    } catch (err) {
      Alert.alert('Error', friendlyError(err.code));
    } finally {
      setForgotLoading(false);
    }
  }

  function friendlyError(code) {
    switch (code) {
      case 'auth/user-not-found':
        return 'No account found with that email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo & Title */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>💪</Text>
            </View>
            <Text style={styles.appTitle}>Let's Go!</Text>
            <Text style={styles.appSubtitle}>Community Fitness Challenges</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              // Shows the @ key on the keyboard of the user's phone
              keyboardType="email-address"
              // Turns off autocorrect for the email field
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={setPassword}
              // Makes each character entered appear as a dot
              secureTextEntry
              // Changes the return key on the user's keypad to show Done instead
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              style={[styles.primaryButton, loginLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              // Prevents double-tapping while in progress of logging in
              disabled={loginLoading}
            >
              {/* When login in progress, changes button for spinner */}
              {loginLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.linkRow}>
              <TouchableOpacity onPress={() => setShowSignup(true)}>
                <Text style={styles.link}>Create Account</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowForgot(true)}>
                <Text style={styles.link}>Forgot Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sign Up Modal - this is the popup window for Create Account */}
      <Modal visible={showSignup} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Account</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={COLORS.textSecondary}
                value={signupName}
                onChangeText={setSignupName}
                autoCapitalize="words"
              />
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.textSecondary}
                value={signupEmail}
                onChangeText={setSignupEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
                placeholderTextColor={COLORS.textSecondary}
                value={signupPassword}
                onChangeText={setSignupPassword}
                secureTextEntry
              />
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={COLORS.textSecondary}
                value={signupConfirm}
                onChangeText={setSignupConfirm}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.primaryButton, signupLoading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={signupLoading}
              >
                {signupLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  // Hides the modal/popup(false) and clears data fields if opened again
                  setShowSignup(false);
                  setSignupName('');
                  setSignupEmail('');
                  setSignupPassword('');
                  setSignupConfirm('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal visible={showForgot} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.modalCardSmall]}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email and we will send you instructions to reset your password.
            </Text>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.textSecondary}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.primaryButton, forgotLoading && styles.buttonDisabled]}
              onPress={handleForgotPassword}
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Email</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowForgot(false);
                setForgotEmail('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Each key is a style name referenced with styles.keyName
// COLORS, SPACING, SIZES, RADIUS, SHADOW are defined in theme.js and imported at top of file
const styles = StyleSheet.create({
  // flex 1 takes up all available space and makes the background screen blue 
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoCircle: {
    // Square
    width: 100,
    height: 100,
    // with rounded the corners
    borderRadius: 50,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    // ... is the spread operator, applies all 5 characteristics in SHADOW.medium
    ...SHADOW.medium,
  },
  logoEmoji: {
    fontSize: 48,
  },
  appTitle: {
    fontSize: SIZES.xxxlarge,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: SIZES.medium,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOW.medium,
  },
  cardTitle: {
    fontSize: SIZES.xlarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
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
    backgroundColor: COLORS.background,
    marginBottom: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: SIZES.large,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
  },
  link: {
    color: COLORS.primary,
    fontSize: SIZES.medium,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xl,
    maxHeight: '90%',
  },
  modalCardSmall: {
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: SIZES.xlarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  modalSubtitle: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  cancelButton: {
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.medium,
    fontWeight: '600',
  },
});
