import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';

// Auth screens
import LoginScreen from '../screens/LoginScreen';

// App screens
import HomeScreen from '../screens/HomeScreen';
import CreateChallengeScreen from '../screens/CreateChallengeScreen';
import DiscoveryScreen from '../screens/DiscoveryScreen';
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import ActiveChallengeScreen from '../screens/ActiveChallengeScreen';
import CompletedChallengeScreen from '../screens/CompletedChallengeScreen';
import MessageCenterScreen from '../screens/MessageCenterScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateChallenge"
        component={CreateChallengeScreen}
        options={{ title: 'Create Challenge' }}
      />
      <Stack.Screen
        name="Discovery"
        component={DiscoveryScreen}
        options={{ title: 'Find a Challenge' }}
      />
      <Stack.Screen
        name="ChallengeDetail"
        component={ChallengeDetailScreen}
        options={{ title: 'Challenge Details' }}
      />
      <Stack.Screen
        name="ActiveChallenge"
        component={ActiveChallengeScreen}
        options={{ title: 'Active Challenge' }}
      />
      <Stack.Screen
        name="CompletedChallenge"
        component={CompletedChallengeScreen}
        options={{ title: 'Completed Challenge' }}
      />
      <Stack.Screen
        name="MessageCenter"
        component={MessageCenterScreen}
        options={{ title: 'Message Center' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user } = useAuth();
  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
