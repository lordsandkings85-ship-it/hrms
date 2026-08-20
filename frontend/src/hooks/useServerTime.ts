import { useState, useEffect, useCallback, useRef } from 'react';
import { syncServerTime, getServerNow, getServerISO } from '../utils/serverTime';

export function useServerTime() {
  const [now, setNow] = useState(() => getServerNow());
  const syncedRef = useRef(false);
  const lastLocalRef = useRef(Date.now());

  useEffect(() => {
    let alive = true;
    let interval: ReturnType<typeof setInterval>;

    (async () => {
      await syncServerTime();
      if (!alive) return;
      syncedRef.current = true;
      lastLocalRef.current = Date.now();
      setNow(getServerNow());

      interval = setInterval(() => {
        const currentLocal = Date.now();
        const elapsed = currentLocal - lastLocalRef.current;
        lastLocalRef.current = currentLocal;

        if (elapsed > 2000 || elapsed < -1000) {
          syncServerTime();
        }

        setNow(getServerNow());
      }, 1000);
    })();

    const resync = setInterval(() => {
      syncServerTime();
    }, 60000);

    return () => {
      alive = false;
      clearInterval(interval);
      clearInterval(resync);
    };
  }, []);

  const getTime = useCallback(() => getServerNow(), [now]);
  const getISO = useCallback(() => getServerISO(), [now]);

  return { now, getTime, getISO, synced: syncedRef.current };
}
