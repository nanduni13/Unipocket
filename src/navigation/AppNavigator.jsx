import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import SubjectsScreen from '../screens/SubjectsScreen';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import StudyPlannerScreen from '../screens/StudyPlannerScreen';
import TaskDetailsScreen from '../screens/TaskDetailsScreen';
import { studentUi as ui } from '../theme/studentUi';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabIcons = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Subjects: { active: 'library', inactive: 'library-outline' },
  Assignments: { active: 'documents', inactive: 'documents-outline' },
  StudyPlanner: { active: 'calendar', inactive: 'calendar-outline' },
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ui.primary,
        tabBarInactiveTintColor: ui.muted,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const icons = tabIcons[route.name];

          return (
            <View style={[styles.iconPill, focused && styles.activePill]}>
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
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          contentStyle: styles.screen,
          headerStyle: styles.header,
          headerTintColor: ui.text,
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
  screen: {
    backgroundColor: ui.background,
  },
  header: {
    backgroundColor: ui.surface,
  },
  headerTitle: {
    fontWeight: '700',
  },
  tabBar: {
    backgroundColor: ui.surface,
    borderTopColor: ui.border,
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
  activePill: {
    backgroundColor: ui.lavender,
  },
});