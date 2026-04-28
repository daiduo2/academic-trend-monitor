// frontend/src/hooks/useWeeklyTrends.ts
import { useState, useEffect } from 'react';
import type { WeeklyReport } from '../types/rss';

/**
 * Get the filename for the rolling 7-day report.
 * Uses YYYY-MM-DD format (today's date) to match the backend file naming.
 */
function getReportFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useWeeklyTrends() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const basePath = import.meta.env.BASE_URL || '/';
    const filename = getReportFilename();

    fetch(`${basePath}data/weekly/${filename}.json`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load weekly report ${filename}: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: WeeklyReport) => {
        setReport(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { report, loading, error };
}
