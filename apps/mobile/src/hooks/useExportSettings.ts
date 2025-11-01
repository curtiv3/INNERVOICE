import { useCallback, useEffect, useState } from 'react';
import { getBooleanSetting, setBooleanSetting } from '../storage/settings';

const EXPORT_ANON_KEY = 'export_anonymize_default';

export function useExportSettings(ready = true) {
  const [anonymizeByDefault, setAnonymizeByDefault] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    getBooleanSetting(EXPORT_ANON_KEY, true)
      .then(value => {
        setAnonymizeByDefault(value);
      })
      .finally(() => setLoading(false));
  }, [ready]);

  const update = useCallback(async (next: boolean) => {
    setAnonymizeByDefault(next);
    await setBooleanSetting(EXPORT_ANON_KEY, next);
  }, []);

  return { anonymizeByDefault, loading, setAnonymizeByDefault: update };
}
