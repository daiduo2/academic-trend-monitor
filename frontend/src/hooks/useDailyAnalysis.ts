import { useEffect, useState } from 'react';
import type { DailyAnalysis } from '../types/rss';

function getReportFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useDailyAnalysis() {
  const [analysis, setAnalysis] = useState<DailyAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const filename = getReportFilename();
    fetch(`./data/analysis/daily/${filename}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`Analysis not found: ${res.status}`);
        return res.json();
      })
      .then((data: DailyAnalysis) => {
        setAnalysis(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { analysis, loading, error };
}
