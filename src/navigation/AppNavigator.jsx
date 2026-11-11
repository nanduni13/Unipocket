import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import SubjectsScreen from '../screens/SubjectsScreen';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import StudyPlannerScreen from '../screens/StudyPlannerScreen';
import TaskDetailsScreen from '../screens/TaskDetailsScreen';
import { useAppTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabIcons = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Subjects: { active: 'library', inactive: 'library-outline' },
  Assignments: { active: 'documents', inactive: 'documents-outline' },
  StudyPlanner: { active: 'calendar', inactive: 'calendar-outline' },
};

function Tabs() {
  const { colors } = useAppTheme();
  const muted =
    colors.muted ?? colors.textMuted ?? colors.textSecondary ?? colors.text;
  const activePillColor =
    colors.lavender ?? colors.primarySoft ?? colors.background;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const icons = tabIcons[route.name];

          return (
            <View
              style={[
                styles.iconPill,
                focused && { backgroundColor: activePillColor },
              ]}
            >
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={21}
                color={color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen name="Subjects" component={SubjectsScreen} />
      <Tab.Screen name="Assignments" component={AssignmentsScreen} />
      <Tab.Screen
        name="StudyPlanner"
        component={StudyPlannerScreen}
        options={{ tabBarLabel: 'Planner' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors, isDark, mode } = useAppTheme();
  const baseTheme = (isDark ?? (mode === 'dark')) ? DarkTheme : DefaultTheme;

  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.danger ?? colors.error ?? baseTheme.colors.notification,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: styles.headerTitle,
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={Tabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TaskDetails"
          component={TaskDetailsScreen}
          options={{ title: 'Task Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontWeight: '700',
  },
  tabItem: {
    paddingVertical: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconPill: {
    width: 48,
    height: 28,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});