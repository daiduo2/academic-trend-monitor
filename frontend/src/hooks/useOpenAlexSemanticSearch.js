import { useEffect, useState } from 'react';
import {
  buildOpenAlexSemanticSearchErrorState,
  buildOpenAlexSemanticSearchIdleState,
  buildOpenAlexSemanticSearchPath,
  normalizeOpenAlexSemanticSearchResponse,
  OPENALEX_SEMANTIC_SEARCH_REQUEST_LIMIT,
} from '../utils/openAlexSemanticSearch';

export function useOpenAlexSemanticSearch(
  query,
  {
    enabled = true,
    fieldLabel = 'all',
  } = {},
) {
  const [state, setState] = useState(() => buildOpenAlexSemanticSearchIdleState());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const normalizedQuery = String(query || '').trim();
    if (!enabled || !normalizedQuery) {
      setState(buildOpenAlexSemanticSearchIdleState());
      setLoading(false);
      return undefined;
    }

    if (!import.meta.env.DEV) {
      setState({
        ...buildOpenAlexSemanticSearchIdleState(),
        message: 'Semantic assist is available only through the local Vite dev bridge. Lexical Top Matches remain the baseline.',
        reason: 'semantic_assist_dev_only',
        status: 'unavailable',
      });
      setLoading(false);
      return undefined;
    }

    const abortController = new AbortController();
    let cancelled = false;

    async function loadSemanticAssist() {
      try {
        setLoading(true);

        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(
          buildOpenAlexSemanticSearchPath(basePath, {
            limit: OPENALEX_SEMANTIC_SEARCH_REQUEST_LIMIT,
            query: normalizedQuery,
          }),
          {
            headers: {
              Accept: 'application/json',
            },
            signal: abortController.signal,
          },
        );

        const payload = await response.json().catch(() => null);
        const normalized = normalizeOpenAlexSemanticSearchResponse(payload, {
          fieldLabel,
        });

        if (!response.ok && normalized.available) {
          throw new Error(`Semantic assist request failed: ${response.status} ${response.statusText}`);
        }

        if (!cancelled) {
          setState(normalized);
        }
      } catch (error) {
        if (cancelled || abortController.signal.aborted) {
          return;
        }
        setState(buildOpenAlexSemanticSearchErrorState(error));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSemanticAssist();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [enabled, fieldLabel, query]);

  return {
    ...state,
    loading,
  };
}

export default useOpenAlexSemanticSearch;
