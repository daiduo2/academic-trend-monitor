// frontend/src/hooks/usePreferences.ts
import { useState, useEffect, useCallback } from 'react';
import type { UserPreferences } from '../types/rss';

const STORAGE_KEY = 'academic-trend-preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  subscribedTags: [],
  rssFormat: 'atom',
  minScore: 0.6,
  digestMode: 'daily',
  lastSync: new Date().toISOString(),
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch {
        console.error('Failed to parse preferences');
      }
    }
    setLoaded(true);
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
  }, [preferences, loaded]);

  const subscribeTag = useCallback((tagId: string) => {
    setPreferences(prev => ({
      ...prev,
      subscribedTags: [...new Set([...prev.subscribedTags, tagId])],
      lastSync: new Date().toISOString(),
    }));
  }, []);

  const unsubscribeTag = useCallback((tagId: string) => {
    setPreferences(prev => ({
      ...prev,
      subscribedTags: prev.subscribedTags.filter(id => id !== tagId),
      lastSync: new Date().toISOString(),
    }));
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    setPreferences(prev => {
      const isSubscribed = prev.subscribedTags.includes(tagId);
      return {
        ...prev,
        subscribedTags: isSubscribed
          ? prev.subscribedTags.filter(id => id !== tagId)
          : [...prev.subscribedTags, tagId],
        lastSync: new Date().toISOString(),
      };
    });
  }, []);

  const updateFormat = useCallback((format: 'atom' | 'json') => {
    setPreferences(prev => ({ ...prev, rssFormat: format }));
  }, []);

  const updateMinScore = useCallback((score: number) => {
    setPreferences(prev => ({ ...prev, minScore: score }));
  }, []);

  const updateDigestMode = useCallback((mode: 'daily' | 'realtime') => {
    setPreferences(prev => ({ ...prev, digestMode: mode }));
  }, []);

  return {
    preferences,
    loaded,
    setPreferences,
    subscribeTag,
    unsubscribeTag,
    toggleTag,
    updateFormat,
    updateMinScore,
    updateDigestMode,
  };
}
