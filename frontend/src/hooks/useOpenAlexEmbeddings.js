import { useEffect, useState } from 'react';
import {
  buildOpenAlexEmbeddingsAssetPath,
  normalizeOpenAlexEmbeddingsBundle,
} from '../utils/openAlexEmbeddingsBundle';

export function useOpenAlexEmbeddings() {
  const [bundle, setBundle] = useState(null);
  const [embeddings, setEmbeddings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBundle() {
      try {
        setLoading(true);
        setError(null);

        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(buildOpenAlexEmbeddingsAssetPath(basePath, 'topic_embeddings_bundle.json'));

        if (!response.ok) {
          throw new Error(`Failed to load OpenAlex embeddings bundle: ${response.status} ${response.statusText}`);
        }

        const payload = await response.json();

        if (!cancelled) {
          setBundle(payload);
          setEmbeddings(normalizeOpenAlexEmbeddingsBundle(payload));
        }
      } catch (nextError) {
        if (!cancelled) {
          setBundle(null);
          setEmbeddings(null);
          setError(nextError instanceof Error ? nextError : new Error(String(nextError)));
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
    embeddings,
    loading,
    error,
  };
}

export default useOpenAlexEmbeddings;
