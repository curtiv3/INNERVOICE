import { useCallback, useEffect, useState } from 'react';
import { getBooleanSetting, setBooleanSetting } from '../storage/settings';
import { ensureDeviceKeyMaterial, ensureContentEncryptionKey } from '../crypto/deviceKeys';

const SYNC_ENABLED_KEY = 'sync_enabled';

export function useSyncSettings(ready = true) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    getBooleanSetting(SYNC_ENABLED_KEY, false)
      .then(value => {
        setEnabled(value);
      })
      .finally(() => setLoading(false));
  }, [ready]);

  const update = useCallback(async (next: boolean) => {
    setEnabled(next);
    await setBooleanSetting(SYNC_ENABLED_KEY, next);
    if (next) {
      await ensureDeviceKeyMaterial();
      await ensureContentEncryptionKey();
    }
  }, []);

  return { enabled, loading, setEnabled: update };
}
