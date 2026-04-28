import { useEffect, useState } from 'react';
import {
  buildOpenAlexFullPaperTopicStructurePath,
  normalizeOpenAlexFullPaperTopicStructureBundle,
} from '../utils/openAlexFullPaperTopicStructureBundle';

export function useOpenAlexFullPaperTopicStructure() {
  const [topicStructure, setTopicStructure] = useState(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadBundle() {
      if (!import.meta.env.DEV) {
        setTopicStructure(null);
        setMessage('The full-paper topic structure is available through the local Vite dev bridge only.');
        setStatus('unavailable');
        return;
      }

      try {
        setTopicStructure(null);
        setMessage('');
        setStatus('loading');

        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(buildOpenAlexFullPaperTopicStructurePath(basePath));
        const payload = await response.json().catch(() => null);

        if (payload?.available === false) {
          if (!cancelled) {
            setTopicStructure(null);
            setMessage(payload.message || 'OpenAlex full-paper topic structure is unavailable.');
            setStatus('unavailable');
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load OpenAlex full-paper topic structure: ${response.status} ${response.statusText}`);
        }

        const normalizedBundle = normalizeOpenAlexFullPaperTopicStructureBundle(payload);

        if (!cancelled) {
          setTopicStructure(normalizedBundle);
          setMessage('');
          setStatus('ready');
        }
      } catch (nextError) {
        if (!cancelled) {
          const normalizedError = nextError instanceof Error ? nextError : new Error(String(nextError));
          setTopicStructure(null);
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
    topicStructure,
  };
}

export default useOpenAlexFullPaperTopicStructure;
