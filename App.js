import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DataProvider, useData } from './src/context/DataContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingState from './src/components/LoadingState';
import ErrorState from './src/components/ErrorState';
import { colors } from './src/theme';

function Root() {
  const { ready, initError, retryInit } = useData();

  if (initError) {
    return (
      <ErrorState
        message={`${initError} Retry does not delete existing data.`}
        onRetry={retryInit}
      />
    );
  }

  if (!ready) {
    return <LoadingState message="Starting UniPocket offline database…" />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <View style={styles.root}>
          <Root />
        </View>
      </DataProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
