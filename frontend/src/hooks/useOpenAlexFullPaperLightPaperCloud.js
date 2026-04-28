import { useEffect, useState } from 'react';
import {
  buildOpenAlexFullPaperLightPaperCloudPath,
  buildOpenAlexFullPaperLightPaperCloudStaticPath,
  normalizeOpenAlexFullPaperLightPaperCloudBundle,
} from '../utils/openAlexFullPaperLightPaperCloudBundle';
import { fetchJsonWithFallback } from '../utils/jsonFetch';

export function useOpenAlexFullPaperLightPaperCloud() {
  const [lightPaperCloud, setLightPaperCloud] = useState(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadBundle() {
      try {
        setLightPaperCloud(null);
        setMessage('');
        setStatus('loading');

        const basePath = import.meta.env.BASE_URL || '/';
        const payload = await fetchJsonWithFallback([
          buildOpenAlexFullPaperLightPaperCloudStaticPath(basePath),
          buildOpenAlexFullPaperLightPaperCloudPath(basePath),
        ]);

        if (payload?.available === false) {
          if (!cancelled) {
            setLightPaperCloud(null);
            setMessage(payload.message || 'OpenAlex full-paper light paper cloud is unavailable.');
            setStatus('unavailable');
          }
          return;
        }

        const normalizedBundle = normalizeOpenAlexFullPaperLightPaperCloudBundle(payload);

        if (!cancelled) {
          setLightPaperCloud(normalizedBundle);
          setMessage('');
          setStatus('ready');
        }
      } catch (nextError) {
        if (!cancelled) {
          const normalizedError = nextError instanceof Error ? nextError : new Error(String(nextError));
          setLightPaperCloud(null);
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
    lightPaperCloud,
    message,
    status,
  };
}

export default useOpenAlexFullPaperLightPaperCloud;
