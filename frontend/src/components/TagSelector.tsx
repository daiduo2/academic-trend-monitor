// frontend/src/components/TagSelector.tsx
import React, { useState, useMemo } from 'react';
import type { TopicIndex } from '../types/rss';

interface TagSelectorProps {
  topics: TopicIndex | null;
  subscribedTags: string[];
  onToggleTag: (tagId: string) => void;
  paperCounts?: Record<string, number>;
}

export function TagSelector({ topics, subscribedTags, onToggleTag, paperCounts }: TagSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const groupedTopics = useMemo(() => {
    if (!topics) return {};

    const groups: Record<string, { code: string; topics: Array<{ id: string; name: string; count: number }> }> = {};

    Object.entries(topics.topics).forEach(([id, topic]) => {
      const catCode = topic.p;
      const catName = topics.categories[catCode] || catCode;

      if (!groups[catName]) {
        groups[catName] = { code: catCode, topics: [] };
      }

      groups[catName].topics.push({
        id,
        name: topic.n,
        count: paperCounts?.[id] || 0,
      });
    });

    // Sort topics by count within each category
    Object.values(groups).forEach(group => {
      group.topics.sort((a, b) => b.count - a.count);
    });

    return groups;
  }, [topics, paperCounts]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedTopics;

    const filtered: typeof groupedTopics = {};
    const lowerSearch = searchTerm.toLowerCase();

    Object.entries(groupedTopics).forEach(([catName, group]) => {
      const matchingTopics = group.topics.filter(
        t => t.name.toLowerCase().includes(lowerSearch) || t.id.includes(searchTerm)
      );
      if (matchingTopics.length > 0) {
        filtered[catName] = { ...group, topics: matchingTopics };
      }
    });

    return filtered;
  }, [groupedTopics, searchTerm]);

  const toggleCategory = (catName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catName)) {
        next.delete(catName);
      } else {
        next.add(catName);
      }
      return next;
    });
  };

  if (!topics) {
    return <div className="tag-selector loading">Loading topics...</div>;
  }

  return (
    <div className="tag-selector">
      <div className="search-box">
        <input
          type="text"
          placeholder="Search topics..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="categories">
        {Object.entries(filteredGroups).map(([catName, group]) => (
          <div key={catName} className="category">
            <button
              className="category-header"
              onClick={() => toggleCategory(catName)}
            >
              <span className="expand-icon">
                {expandedCategories.has(catName) ? '▼' : '▶'}
              </span>
              <span className="category-name">{catName}</span>
              <span className="category-code">({group.code})</span>
            </button>

            {expandedCategories.has(catName) && (
              <div className="topics">
                {group.topics.map(topic => {
                  const isSubscribed = subscribedTags.includes(topic.id);
                  return (
                    <label key={topic.id} className={`topic ${isSubscribed ? 'subscribed' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isSubscribed}
                        onChange={() => onToggleTag(topic.id)}
                      />
                      <span className="topic-name">{topic.name}</span>
                      <span className="topic-id">({topic.id})</span>
                      {topic.count > 0 && (
                        <span className="topic-count">{topic.count} papers/week</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="selection-summary">
        Selected: {subscribedTags.length} topics
      </div>
    </div>
  );
}
