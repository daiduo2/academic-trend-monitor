import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildOpenAlexGraphAssetPath,
  normalizeOpenAlexGraphBundle,
} from '../utils/openAlexGraphBundle';

export function useOpenAlexGraph() {
  const [graph, setGraph] = useState(null);
  const [bundle, setBundle] = useState(null);
  const [legend, setLegend] = useState(null);
  const [evidenceLookup, setEvidenceLookup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState(null);
  const evidenceRequestRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialBundle() {
      try {
        setLoading(true);
        setError(null);

        const basePath = import.meta.env.BASE_URL || '/';
        const [bundleResponse, legendResponse] = await Promise.all([
          fetch(buildOpenAlexGraphAssetPath(basePath, 'graph_bundle.json')),
          fetch(buildOpenAlexGraphAssetPath(basePath, 'legend.json')),
        ]);

        if (!bundleResponse.ok) {
          throw new Error(`Failed to load OpenAlex graph bundle: ${bundleResponse.status} ${bundleResponse.statusText}`);
        }
        if (!legendResponse.ok) {
          throw new Error(`Failed to load OpenAlex graph legend: ${legendResponse.status} ${legendResponse.statusText}`);
        }

        const [bundlePayload, legendPayload] = await Promise.all([
          bundleResponse.json(),
          legendResponse.json(),
        ]);

        if (!cancelled) {
          setBundle(bundlePayload);
          setLegend(legendPayload);
          setGraph(normalizeOpenAlexGraphBundle(bundlePayload, legendPayload));
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError : new Error(String(nextError)));
          setBundle(null);
          setLegend(null);
          setGraph(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialBundle();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadEvidenceLookup = useCallback(async () => {
    if (evidenceLookup) {
      return evidenceLookup;
    }

    if (evidenceRequestRef.current) {
      return evidenceRequestRef.current;
    }

    const basePath = import.meta.env.BASE_URL || '/';
    setEvidenceLoading(true);
    setEvidenceError(null);

    evidenceRequestRef.current = fetch(buildOpenAlexGraphAssetPath(basePath, 'evidence_lookup.json'))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load OpenAlex evidence lookup: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((payload) => {
        setEvidenceLookup(payload);
        return payload;
      })
      .catch((nextError) => {
        const normalizedError = nextError instanceof Error ? nextError : new Error(String(nextError));
        setEvidenceError(normalizedError);
        throw normalizedError;
      })
      .finally(() => {
        evidenceRequestRef.current = null;
        setEvidenceLoading(false);
      });

    return evidenceRequestRef.current;
  }, [evidenceLookup]);

  const requestEdgeEvidence = useCallback(async (edgeId) => {
    const payload = await loadEvidenceLookup();
    return payload?.by_edge_id?.[edgeId] || null;
  }, [loadEvidenceLookup]);

  return {
    graph,
    bundle,
    legend,
    evidenceLookup,
    loading,
    error,
    evidenceLoading,
    evidenceError,
    requestEdgeEvidence,
  };
}

export default useOpenAlexGraph;
