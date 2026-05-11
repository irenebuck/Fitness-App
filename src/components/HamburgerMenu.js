import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  // renders content on top of everything on screen, like a popup or dropdown 
  Modal,
  StyleSheet,
  // like TouchableOpacity. Tapping on it closes menu
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function HamburgerMenu() {
  // whether menu is open or closed
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();
  const { logout } = useAuth();

  const items = [
    { label: 'Create a New Challenge', icon: 'add-circle-outline', screen: 'CreateChallenge' },
    { label: 'Join a Challenge', icon: 'search-outline', screen: 'Discovery' },
    { label: 'Message Center', icon: 'chatbubbles-outline', screen: 'MessageCenter' },
    { label: 'Profile', icon: 'person-outline', screen: 'Profile' },
  ];

  // When menu is tapped, closes menu first and then navigates
  function navigate(screen) {
    setVisible(false);
    navigation.navigate(screen);
  }

  // Closes the menu first, then logs out. logout() from AuthContext signs out of Firebase and 
  // clears state, which triggers AppNavigator to automatically switch to the login screen.
  async function handleLogout() {
    setVisible(false);
    await logout();
  }

  return (
    <>
      {/* When you click on the hamburger icon, the modal opens */}
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.trigger}>
        <Ionicons name="menu" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Transparent makes the screen the modal lay atop dim. */}
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.menu}>
            {/* Loops thru items array and renders a row for each one. Tapping row navigates away */}
            {items.map((item) => (
              <TouchableOpacity
                key={item.screen}
                style={styles.menuItem}
                onPress={() => navigate(item.screen)}
              >
                <Ionicons name={item.icon} size={22} color={COLORS.primary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            {/* Creates a 1px tall border to separate navigation items */}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color={COLORS.red} />
              <Text style={[styles.menuLabel, { color: COLORS.red }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: SPACING.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: SPACING.lg,
  },
  menu: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    minWidth: 240,
    paddingVertical: SPACING.sm,
    ...SHADOW.medium,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  menuLabel: {
    fontSize: SIZES.medium,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.xs,
  },
});
