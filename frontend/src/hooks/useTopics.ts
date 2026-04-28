// frontend/src/hooks/useTopics.ts
import { useState, useEffect } from 'react';
import type { TopicIndex } from '../types/rss';

export function useTopics() {
  const [topics, setTopics] = useState<TopicIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const basePath = import.meta.env.BASE_URL || '/';

    fetch(`${basePath}data/output/topics.json`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load topics index: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
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
