import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { initializeDatabase } from '../database';

const DataContext = createContext(null);

/**
 * Shared refresh mechanism so screens reload after mutations.
 * refreshKey increments; screens watch it via useEffect.
 */
export function DataProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [seedInfo, setSeedInfo] = useState(null);
  const [initAttempt, setInitAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await initializeDatabase();
        if (!cancelled) {
          setSeedInfo(info);
          setReady(true);
          setInitError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setInitError(error?.message || 'Database initialisation failed.');
          setReady(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initAttempt]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const retryInit = useCallback(() => {
    setInitError(null);
    setReady(false);
    setInitAttempt((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      initError,
      refreshKey,
      refresh,
      retryInit,
      seedInfo,
    }),
    [ready, initError, refreshKey, refresh, retryInit, seedInfo],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within DataProvider');
  }
  return ctx;
}
