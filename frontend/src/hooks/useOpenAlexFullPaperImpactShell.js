import { useEffect, useState } from 'react';
import {
  buildOpenAlexFullPaperImpactShellPath,
  normalizeOpenAlexFullPaperImpactShellBundle,
} from '../utils/openAlexFullPaperImpactShellBundle';

export function useOpenAlexFullPaperImpactShell() {
  const [impactShell, setImpactShell] = useState(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadBundle() {
      if (!import.meta.env.DEV) {
        setImpactShell(null);
        setMessage('The full-paper impact shell is available through the local Vite dev bridge only.');
        setStatus('unavailable');
        return;
      }

      try {
        setImpactShell(null);
        setMessage('');
        setStatus('loading');

        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(buildOpenAlexFullPaperImpactShellPath(basePath));
        const payload = await response.json().catch(() => null);

        if (payload?.available === false) {
          if (!cancelled) {
            setImpactShell(null);
            setMessage(payload.message || 'OpenAlex full-paper impact shell is unavailable.');
            setStatus('unavailable');
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load OpenAlex full-paper impact shell: ${response.status} ${response.statusText}`);
        }

        if (!cancelled) {
          setImpactShell(normalizeOpenAlexFullPaperImpactShellBundle(payload));
          setMessage('');
          setStatus('ready');
        }
      } catch (nextError) {
        if (!cancelled) {
          const normalizedError = nextError instanceof Error ? nextError : new Error(String(nextError));
          setImpactShell(null);
          setMessage(normalizedError.message);
          setStatus('error');
        }
      }
    }

    loadBundle();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    impactShell,
    message,
    status,
  };
}

export default useOpenAlexFullPaperImpactShell;
