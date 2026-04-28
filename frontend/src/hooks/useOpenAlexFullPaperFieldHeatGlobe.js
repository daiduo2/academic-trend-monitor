import { useEffect, useState } from 'react';
import {
  buildOpenAlexFullPaperFieldHeatGlobePath,
  normalizeOpenAlexFullPaperFieldHeatGlobeBundle,
} from '../utils/openAlexFullPaperFieldHeatGlobeBundle';

export function useOpenAlexFullPaperFieldHeatGlobe() {
  const [fieldHeatGlobe, setFieldHeatGlobe] = useState(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadBundle() {
      if (!import.meta.env.DEV) {
        setFieldHeatGlobe(null);
        setMessage('The full-paper field heat globe is available through the local Vite dev bridge only.');
        setStatus('unavailable');
        return;
      }

      try {
        setFieldHeatGlobe(null);
        setMessage('');
        setStatus('loading');

        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(buildOpenAlexFullPaperFieldHeatGlobePath(basePath));
        const payload = await response.json().catch(() => null);

        if (payload?.available === false) {
          if (!cancelled) {
            setFieldHeatGlobe(null);
            setMessage(payload.message || 'OpenAlex full-paper field heat globe is unavailable.');
            setStatus('unavailable');
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load OpenAlex full-paper field heat globe: ${response.status} ${response.statusText}`);
        }

        const normalizedBundle = normalizeOpenAlexFullPaperFieldHeatGlobeBundle(payload);

        if (!cancelled) {
          setFieldHeatGlobe(normalizedBundle);
          setMessage('');
          setStatus('ready');
        }
      } catch (nextError) {
        if (!cancelled) {
          const normalizedError = nextError instanceof Error ? nextError : new Error(String(nextError));
          setFieldHeatGlobe(null);
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
    fieldHeatGlobe,
    message,
    status,
  };
}

export default useOpenAlexFullPaperFieldHeatGlobe;
