import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../hooks/useAuth';
import { usePendingRecords } from '../hooks/useRecords';
import { useGroups } from '../hooks/useGroups';
import { COLORS } from '../constants/colors';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { InputScreen } from '../screens/input/InputScreen';
import { ResultScreen } from '../screens/result/ResultScreen';
import { SummaryScreen } from '../screens/summary/SummaryScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type TabParamList = {
  Home: undefined;
  Input: undefined;
  Result: undefined;
  Summary: undefined;
  Settings: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const AuthNavigator: React.FC = () => {
  const [screen, setScreen] = useState<'Login' | 'Register'>('Login');
  if (screen === 'Login') {
    return <LoginScreen onNavigateRegister={() => setScreen('Register')} />;
  }
  return <RegisterScreen onNavigateLogin={() => setScreen('Login')} />;
};

const ResultTabIcon: React.FC<{ color: string; size: number; userId: string }> = ({ color, size, userId }) => {
  const { groups } = useGroups(userId);
  const firstGroupId = groups[0]?.groupId;
  const { pending } = usePendingRecords(firstGroupId);

  return (
    <View>
      <Ionicons name="flag" size={size} color={color} />
      {pending.length > 0 && (
        <View style={badgeStyles.badge}>
          <Text style={badgeStyles.text}>{pending.length > 9 ? '9+' : pending.length}</Text>
        </View>
      )}
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  text: { color: '#fff', fontSize: 9, fontWeight: '700' },
});

const MainNavigator: React.FC<{ userId: string }> = ({ userId }) => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarStyle: {
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.white,
        height: 56,
        paddingBottom: 6,
      },
      tabBarLabelStyle: { fontSize: 10 },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarLabel: 'ホーム',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="Input"
      component={InputScreen}
      options={{
        tabBarLabel: '入力',
        tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="Result"
      component={ResultScreen}
      options={{
        tabBarLabel: '結果入力',
        tabBarIcon: ({ color, size }) => (
          <ResultTabIcon color={color} size={size} userId={userId} />
        ),
      }}
    />
    <Tab.Screen
      name="Summary"
      component={SummaryScreen}
      options={{
        tabBarLabel: '集計',
        tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        tabBarLabel: '設定',
        tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
      }}
    />
  </Tab.Navigator>
);

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingTitle}>ノリレク</Text>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator userId={user.uid} /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 2,
  },
});
