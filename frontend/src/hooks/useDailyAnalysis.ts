import { useEffect, useState } from 'react';
import type { DailyAnalysis } from '../types/rss';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRecentReportFilenames(days: number): string[] {
  const now = new Date();
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    return formatDate(date);
  });
}

export function useDailyAnalysis() {
  const [analysis, setAnalysis] = useState<DailyAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAnalysis = async () => {
      const filenames = getRecentReportFilenames(14);

      for (const filename of filenames) {
        const res = await fetch(`./data/analysis/daily/${filename}.json`);
        if (!res.ok) {
          continue;
        }

        const data = (await res.json()) as DailyAnalysis;
        if (!cancelled) {
          setAnalysis(data);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setError('最近 14 天内没有可用的日报分析。');
        setLoading(false);
      }
    };

    loadAnalysis().catch(err => {
      if (!cancelled) {
        setError(err.message);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { analysis, loading, error };
}
