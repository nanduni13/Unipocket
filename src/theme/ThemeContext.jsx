import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

const lightColors = {
  background: '#FAF8F4',
  surface: '#FFFFFF',
  text: '#241B36',
  muted: '#625970',
  primary: '#6636C9',
  onPrimary: '#FFFFFF',
  border: '#E9E0EF',
  lavender: '#EFE6FF',
  mint: '#DDF5E8',
  peach: '#FFE6D9',
  yellow: '#FFF1BF',
};

const darkColors = {
  background: '#15121B',
  surface: '#221D2C',
  text: '#F3EDF9',
  muted: '#C4B8D0',
  primary: '#C9ACFF',
  onPrimary: '#28144B',
  border: '#443A50',
  lavender: '#35284A',
  mint: '#203B34',
  peach: '#432F2C',
  yellow: '#403821',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [selectedMode, setSelectedMode] = useState(null);

  const mode = selectedMode ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const isDark = mode === 'dark';

  function toggleTheme() {
    setSelectedMode((current) => {
      const activeMode = current ?? mode;
      return activeMode === 'dark' ? 'light' : 'dark';
    });
  }

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        colors: isDark ? darkColors : lightColors,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error('useAppTheme must be used inside ThemeProvider');
  }

  return theme;
}