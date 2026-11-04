import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getLocalDateString, msUntilNextLocalMidnight } from '../utils/dates';

/**
 * Reload time-sensitive data when the app returns to the foreground
 * or when the local calendar day changes. No polling loop.
 */
export function useForegroundAndMidnightRefresh(onRefresh) {
  const callbackRef = useRef(onRefresh);
  callbackRef.current = onRefresh;
  const lastDayRef = useRef(getLocalDateString());

  useEffect(() => {
    const run = () => {
      lastDayRef.current = getLocalDateString();
      callbackRef.current?.();
    };

    const onAppState = (state) => {
      if (state !== 'active') return;
      run();
    };

    const sub = AppState.addEventListener('change', onAppState);

    let timeoutId;
    const scheduleMidnight = () => {
      timeoutId = setTimeout(() => {
        run();
        scheduleMidnight();
      }, msUntilNextLocalMidnight());
    };
    scheduleMidnight();

    return () => {
      sub.remove();
      clearTimeout(timeoutId);
    };
  }, []);
}
