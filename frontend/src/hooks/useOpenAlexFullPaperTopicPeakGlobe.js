import { useEffect, useState } from 'react';
import {
  buildOpenAlexFullPaperTopicPeakGlobePath,
  buildOpenAlexFullPaperTopicPeakGlobeStaticPath,
  normalizeOpenAlexFullPaperTopicPeakGlobeBundle,
} from '../utils/openAlexFullPaperTopicPeakGlobeBundle';
import { fetchJsonWithFallback } from '../utils/jsonFetch';

export function useOpenAlexFullPaperTopicPeakGlobe() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('loading');
  const [topicPeakGlobe, setTopicPeakGlobe] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBundle() {
      try {
        setTopicPeakGlobe(null);
        setMessage('');
        setStatus('loading');

        const basePath = import.meta.env.BASE_URL || '/';
        const payload = await fetchJsonWithFallback([
          buildOpenAlexFullPaperTopicPeakGlobeStaticPath(basePath),
          buildOpenAlexFullPaperTopicPeakGlobePath(basePath),
        ]);

        if (payload?.available === false) {
          if (!cancelled) {
            setTopicPeakGlobe(null);
            setMessage(payload.message || 'OpenAlex full-paper topic peak globe is unavailable.');
            setStatus('unavailable');
          }
          return;
        }

        const normalizedBundle = normalizeOpenAlexFullPaperTopicPeakGlobeBundle(payload);

        if (!cancelled) {
          setTopicPeakGlobe(normalizedBundle);
          setMessage('');
          setStatus('ready');
        }
      } catch (nextError) {
        if (!cancelled) {
          const normalizedError = nextError instanceof Error ? nextError : new Error(String(nextError));
          setTopicPeakGlobe(null);
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
    message,
    status,
    topicPeakGlobe,
  };
}

export default useOpenAlexFullPaperTopicPeakGlobe;
