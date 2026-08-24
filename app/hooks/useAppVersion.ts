import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';

/**
 * Versione dell'app (da Tauri, riflette il binario in esecuzione).
 * getVersion() fallisce fuori dal runtime Tauri (browser puro): in quel caso
 * la versione resta vuota e non viene mostrata.
 */
export function useAppVersion() {
  const [version, setVersion] = useState('');

  useEffect(() => {
    let active = true;
    void getVersion()
      .then((v) => { if (active) setVersion(v); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return { version };
}
