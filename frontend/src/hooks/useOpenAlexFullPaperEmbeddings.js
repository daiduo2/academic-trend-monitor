import { useEffect, useState } from 'react';
import {
  buildOpenAlexFullPaperEmbeddingsPath,
  normalizeOpenAlexFullPaperEmbeddingsBundle,
} from '../utils/openAlexFullPaperEmbeddingsBundle';

export function useOpenAlexFullPaperEmbeddings() {
  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState(null);
  const [fullPaperEmbeddings, setFullPaperEmbeddings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadBundle() {
      if (!import.meta.env.DEV) {
        setBundle(null);
        setError(null);
        setFullPaperEmbeddings(null);
        setLoading(false);
        setMessage('The full-paper title-only baseline is available through the local Vite dev bridge only.');
        setStatus('unavailable');
        return;
      }

      try {
        setBundle(null);
        setError(null);
        setFullPaperEmbeddings(null);
        setLoading(true);
        setMessage('');
        setStatus('loading');

        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(buildOpenAlexFullPaperEmbeddingsPath(basePath));
        const payload = await response.json().catch(() => null);

        if (payload?.available === false) {
          if (!cancelled) {
            setBundle(null);
            setError(null);
            setFullPaperEmbeddings(null);
            setMessage(payload.message || 'OpenAlex full-paper title-only baseline is unavailable.');
            setStatus('unavailable');
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load OpenAlex full-paper title-only baseline: ${response.status} ${response.statusText}`);
        }

        if (!cancelled) {
          setBundle(payload);
          setError(null);
          setFullPaperEmbeddings(normalizeOpenAlexFullPaperEmbeddingsBundle(payload));
          setMessage('');
          setStatus('ready');
        }
      } catch (nextError) {
        if (!cancelled) {
          const normalizedError = nextError instanceof Error ? nextError : new Error(String(nextError));
          setBundle(null);
          setError(normalizedError);
          setFullPaperEmbeddings(null);
          setMessage(normalizedError.message);
          setStatus('error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBundle();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    bundle,
    error,
    fullPaperEmbeddings,
    loading,
    message,
    status,
  };
}

export default useOpenAlexFullPaperEmbeddings;
