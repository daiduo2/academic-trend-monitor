// frontend/src/hooks/useWeeklyTrends.ts
import { useState, useEffect } from 'react';
import type { WeeklyReport } from '../types/rss';

function getCurrentWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  // Match Python's %W: Monday-based week, week 0 = days before first Monday
  const startOfYear = new Date(year, 0, 1);
  const dayOfWeek = startOfYear.getDay(); // 0 = Sunday, 1 = Monday

  // Days from start of year to first Monday
  // If Jan 1 is Monday (1), daysToFirstMonday = 0
  // If Jan 1 is Sunday (0), daysToFirstMonday = 1
  // If Jan 1 is Thursday (4), daysToFirstMonday = 4
  let daysToFirstMonday: number;
  if (dayOfWeek === 0) { // Sunday
    daysToFirstMonday = 1;
  } else if (dayOfWeek === 1) { // Monday
    daysToFirstMonday = 0;
  } else {
    daysToFirstMonday = 8 - dayOfWeek; // Days until next Monday
  }

  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);

  // If today is before first Monday, we're in week 00 or last year
  if (now < firstMonday) {
    // Days from Jan 1 to today
    const daysSinceJan1 = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return `${year}-W${daysSinceJan1.toString().padStart(2, '0')}`;
  }

  // Calculate week number: week 1 starts on first Monday
  const daysSinceFirstMonday = Math.floor((now.getTime() - firstMonday.getTime()) / (24 * 60 * 60 * 1000));
  const week = 1 + Math.floor(daysSinceFirstMonday / 7);

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
