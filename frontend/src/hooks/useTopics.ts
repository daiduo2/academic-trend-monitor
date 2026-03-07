// frontend/src/hooks/useTopics.ts
import { useState, useEffect } from 'react';
import type { TopicIndex } from '../types/rss';

export function useTopics() {
  const [topics, setTopics] = useState<TopicIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use relative path for static deployment compatibility
    fetch('./data/output/topics.json')
      .then(res => res.json())
      .then((data: TopicIndex) => {
        setTopics(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { topics, loading, error };
}
