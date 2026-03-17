import { useState, useEffect, useCallback } from 'react';
import type { VisualizationData, Manifest, DomainConfig } from '../types/evolution';

interface UseEvolutionDataReturn {
  data: VisualizationData | null;
  manifest: Manifest | null;
  loading: boolean;
  error: string | null;
  currentDomain: string;
  availableDomains: DomainConfig[];
  loadDomain: (domain: string) => Promise<void>;
}

const BASE_URL = import.meta.env.BASE_URL + 'data/output/evolution_graphs';

export function useEvolutionData(): UseEvolutionDataReturn {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [data, setData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('math');

  // Load manifest on mount
  useEffect(() => {
    async function loadManifest() {
      try {
        const response = await fetch(`${BASE_URL}/manifest.json`);
        if (!response.ok) throw new Error('Failed to load manifest');
        const manifestData: Manifest = await response.json();
        setManifest(manifestData);
        setCurrentDomain(manifestData.default_domain);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
    loadManifest();
  }, []);

  // Load domain data
  const loadDomain = useCallback(async (domain: string) => {
    setLoading(true);
    setError(null);

    try {
      const domainConfig = manifest?.domains.find(d => d.id === domain);
      if (!domainConfig?.available) {
        throw new Error(`Domain ${domain} is not available`);
      }

      const response = await fetch(`${BASE_URL}/${domainConfig.data_file}`);
      if (!response.ok) throw new Error(`Failed to load data for ${domain}`);

      const domainData: VisualizationData = await response.json();
      setData(domainData);
      setCurrentDomain(domain);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [manifest]);

  // Auto-load default domain when manifest loads
  useEffect(() => {
    if (manifest && currentDomain) {
      loadDomain(currentDomain);
    }
  }, [manifest, currentDomain, loadDomain]);

  return {
    data,
    manifest,
    loading,
    error,
    currentDomain,
    availableDomains: manifest?.domains || [],
    loadDomain
  };
}
