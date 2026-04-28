import { useEffect, useState } from 'react';
import {
  buildOpenAlexTopicPaperEmbeddingsPath,
  normalizeOpenAlexTopicPaperEmbeddingsBundle,
} from '../utils/openAlexTopicPaperEmbeddingsBundle';

export function useOpenAlexTopicPaperEmbeddings() {
  const [bundle, setBundle] = useState(null);
  const [paperEmbeddings, setPaperEmbeddings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadBundle() {
      if (!import.meta.env.DEV) {
        setBundle(null);
        setPaperEmbeddings(null);
        setLoading(false);
        setError(null);
        setStatus('unavailable');
        setMessage('The paper-space pilot is available through the local Vite dev bridge only.');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setStatus('loading');
        setMessage('');

        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(buildOpenAlexTopicPaperEmbeddingsPath(basePath));
        const payload = await response.json().catch(() => null);

        if (payload?.available === false) {
          if (!cancelled) {
            setBundle(null);
            setPaperEmbeddings(null);
            setError(null);
            setStatus('unavailable');
            setMessage(payload.message || 'OpenAlex paper embeddings pilot is unavailable.');
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load OpenAlex paper embeddings pilot: ${response.status} ${response.statusText}`);
        }

        if (!cancelled) {
          setBundle(payload);
          setPaperEmbeddings(normalizeOpenAlexTopicPaperEmbeddingsBundle(payload));
          setError(null);
          setMessage('');
          setStatus('ready');
        }
      } catch (nextError) {
        if (!cancelled) {
          const normalizedError = nextError instanceof Error ? nextError : new Error(String(nextError));
          setBundle(null);
          setPaperEmbeddings(null);
          setError(normalizedError);
          setStatus('error');
          setMessage(normalizedError.message);
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
    loading,
    message,
    paperEmbeddings,
    status,
  };
}

export default useOpenAlexTopicPaperEmbeddings;
