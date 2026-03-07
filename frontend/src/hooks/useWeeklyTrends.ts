// frontend/src/hooks/useWeeklyTrends.ts
import { useState, useEffect } from 'react';
import type { WeeklyReport } from '../types/rss';

function getCurrentWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  // Use ISO week date calculation (Monday-based, matching Python's %W)
  const startOfYear = new Date(year, 0, 1);
  const dayOfWeek = startOfYear.getDay(); // 0 = Sunday, 1 = Monday
  const daysSinceStart = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  // Adjust for Monday-based week (Python %W style)
  const week = Math.floor((daysSinceStart + (dayOfWeek === 0 ? 6 : dayOfWeek - 1)) / 7) + 1;
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

export function useWeeklyTrends() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const week = getCurrentWeek();
    // Use relative path for static deployment compatibility
    fetch(`./data/weekly/${week}.json`)
      .then(res => res.json())
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
