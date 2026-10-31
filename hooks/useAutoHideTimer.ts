import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Auto-hide hook for controls: hides after delayMs without interaction once show() is called.
 * keep() covers cases like "holding the progress bar keeps it visible": returning true postpones the timer.
 */
export function useAutoHideTimer(delayMs = 3000, keep?: () => boolean) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (keep?.()) return;
    timerRef.current = setTimeout(() => setVisible(false), delayMs);
  }, [delayMs, keep]);

  const show = useCallback(() => {
    setVisible(true);
    reset();
  }, [reset]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const toggle = useCallback(() => {
    setVisible(prev => {
      if (!prev) {
        reset();
        return true;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      return false;
    });
  }, [reset]);

  useEffect(() => {
    reset();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { visible, show, hide, toggle, reset };
}
