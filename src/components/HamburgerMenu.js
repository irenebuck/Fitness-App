import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, SIZES, RADIUS, SHADOW } from '../theme';

export default function HamburgerMenu() {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();
  const { logout } = useAuth();

  const items = [
    { label: 'Create a New Challenge', icon: 'add-circle-outline', screen: 'CreateChallenge' },
    { label: 'Join a Challenge', icon: 'search-outline', screen: 'Discovery' },
    { label: 'Message Center', icon: 'chatbubbles-outline', screen: 'MessageCenter' },
    { label: 'Profile', icon: 'person-outline', screen: 'Profile' },
  ];

  function navigate(screen) {
    setVisible(false);
    navigation.navigate(screen);
  }

  async function handleLogout() {
    setVisible(false);
    await logout();
  }

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.trigger}>
        <Ionicons name="menu" size={28} color={COLORS.white} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.menu}>
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
