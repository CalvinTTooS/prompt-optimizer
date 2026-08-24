import { useEffect, useState } from 'react';
import { isDebugSwitchEnabled, setDebugSwitchEnabled } from '../lib/debugSwitch';

export function useDebugLogging() {
  const [debugLoggingEnabled, setDebugLoggingEnabled] = useState<boolean>(false);

  useEffect(() => {
    isDebugSwitchEnabled().then(setDebugLoggingEnabled);
  }, []);

  const handleToggleDebugLogging = async (enabled: boolean) => {
    await setDebugSwitchEnabled(enabled);
    setDebugLoggingEnabled(enabled);
  };

  return { debugLoggingEnabled, handleToggleDebugLogging };
}
