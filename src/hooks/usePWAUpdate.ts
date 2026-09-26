import { useState, useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function usePWAUpdate() {
  const [lastCheckResult, setLastCheckResult] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('Service Worker registered:', swUrl);
      if (registration) {
        // Check for updates periodically (every 30 mins)
        setInterval(() => {
          registration.update().catch((e) => console.warn('Periodic SW update check failed:', e));
        }, 30 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('Service Worker registration error:', error);
    },
  });

  // Manual update check function that user can invoke via UI
  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    setLastCheckResult(null);

    try {
      if (!('serviceWorker' in navigator)) {
        setLastCheckResult('Service Worker wird von diesem Browser nicht unterstuetzt.');
        setIsChecking(false);
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setLastCheckResult('Kein Service Worker registriert. Seite neu laden.');
        setIsChecking(false);
        return;
      }

      await registration.update();

      // If a new worker is waiting or installing
      if (registration.waiting) {
        setNeedRefresh(true);
        setLastCheckResult('Neues Update gefunden! Bitte auf "Aktualisieren" klicken.');
      } else if (registration.installing) {
        setLastCheckResult('Ein Update wird im Hintergrund heruntergeladen...');
      } else {
        setLastCheckResult('Sie nutzen die aktuellste Version der App.');
      }
    } catch (err: any) {
      console.warn('Manual update check error:', err);
      setLastCheckResult('Update-Pruefung fehlgeschlagen: Keine Internetverbindung oder Offline-Betrieb.');
    } finally {
      setIsChecking(false);
    }
  }, [setNeedRefresh]);

  // Check for updates when app returns to foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update().catch(() => {});
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return {
    offlineReady,
    needRefresh,
    updateServiceWorker,
    checkForUpdates,
    isChecking,
    lastCheckResult,
    dismissRefresh: () => setNeedRefresh(false),
  };
}
