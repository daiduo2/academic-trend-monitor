// frontend/src/components/TagSelector.jsx
import React, { useState, useMemo } from 'react';

/**
 * @typedef {Object} CompactTopic
 * @property {string} n - name
 * @property {string[]} k - keywords
 * @property {number} l - layer
 * @property {string} p - parent category code
 */

/**
 * @typedef {Object} TopicIndex
 * @property {string} version
 * @property {Record<string, CompactTopic>} topics
 * @property {Record<string, string>} categories
 */

/**
 * @param {Object} props
 * @param {TopicIndex | null} props.topics
 * @param {string[]} props.subscribedTags
 * @param {(tagId: string) => void} props.onToggleTag
 * @param {Record<string, number>} [props.paperCounts]
 */
export function TagSelector({ topics, subscribedTags, onToggleTag, paperCounts }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const groupedTopics = useMemo(() => {
    if (!topics) return {};

    /** @type {Record<string, { code: string; topics: Array<{ id: string; name: string; count: number }> }>} */
    const groups = {};

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

    /** @type {typeof groupedTopics} */
    const filtered = {};
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

  /**
   * @param {string} catName
   */
  const toggleCategory = (catName) => {
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
    return <div className="tag-selector loading">加载主题中...</div>;
  }

  return (
    <div className="tag-selector">
      <div className="search-box">
        <input
          type="text"
          placeholder="搜索主题..."
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
                        <span className="topic-count">{topic.count} 篇/周</span>
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
        已选择: {subscribedTags.length} 个主题
      </div>
    </div>
  );
}
