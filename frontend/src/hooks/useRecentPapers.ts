// frontend/src/hooks/useRecentPapers.ts
import { useState, useEffect } from 'react';
import type { CompactPaper } from '../types/rss';

export function useRecentPapers() {
  const [papers, setPapers] = useState<CompactPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/recent.jsonl')
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split('\n');
        const parsed = lines.map(line => JSON.parse(line));
        setPapers(parsed);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { papers, loading, error };
}
