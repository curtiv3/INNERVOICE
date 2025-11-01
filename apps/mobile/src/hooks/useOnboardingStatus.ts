import { useCallback, useEffect, useState } from 'react';
import { getBooleanSetting, setBooleanSetting } from '../storage/settings';

const ONBOARDING_KEY = 'onboarding_completed';

export function useOnboardingStatus(ready: boolean) {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    getBooleanSetting(ONBOARDING_KEY, false)
      .then(value => {
        if (!active) return;
        setCompleted(value);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [ready]);

  const markComplete = useCallback(async () => {
    setCompleted(true);
    await setBooleanSetting(ONBOARDING_KEY, true);
  }, []);

  return { completed, loading, markComplete };
}
