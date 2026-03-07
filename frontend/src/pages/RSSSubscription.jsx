// frontend/src/pages/RSSSubscription.jsx
import React, { useMemo } from 'react';
import { TagSelector } from '../components/TagSelector';
import { useTopics } from '../hooks/useTopics';
import { useRecentPapers } from '../hooks/useRecentPapers';
import { useWeeklyTrends } from '../hooks/useWeeklyTrends';
import { usePreferences } from '../hooks/usePreferences';
import { generateAtomFeed, generateJSONFeed, downloadFeed, copyToClipboard } from '../utils/rssGenerator';
import '../styles/rss.css';

export function RSSSubscription() {
  const { topics, loading: topicsLoading } = useTopics();
  const { papers, loading: papersLoading } = useRecentPapers();
  const { report: weeklyReport, loading: trendsLoading } = useWeeklyTrends();
  const { preferences, loaded: prefsLoaded, toggleTag, updateFormat, updateMinScore, updateDigestMode } = usePreferences();

  // Calculate paper counts per topic
  const paperCounts = useMemo(() => {
    /** @type {Record<string, number>} */
    const counts = {};
    papers.forEach(paper => {
      paper.g.forEach(tagId => {
        counts[tagId] = (counts[tagId] || 0) + 1;
      });
    });
    return counts;
  }, [papers]);

  // Filter papers by subscribed tags and min score
  const filteredPapers = useMemo(() => {
    if (!preferences.subscribedTags.length) return [];
    return papers.filter(paper => {
      // Check if paper has any of the subscribed tags
      return paper.g.some((tagId, index) => {
        const tagIdStr = String(tagId);
        if (!preferences.subscribedTags.includes(tagIdStr)) return false;
        // Check if score meets minimum threshold
        const score = paper.s?.[index] || 0.8; // Default score if not available
        return score >= preferences.minScore;
      });
    });
  }, [papers, preferences.subscribedTags, preferences.minScore]);

  const handleGenerateRSS = () => {
    if (!topics) return;

    const topicRecord = Object.entries(topics.topics).reduce((acc, [id, t]) => {
      acc[id] = t;
      return acc;
    }, /** @type {Record<string, import('../types/rss').CompactTopic>} */ ({}));

    if (preferences.rssFormat === 'atom') {
      const feed = generateAtomFeed(filteredPapers, topicRecord);
      downloadFeed(feed, 'academic-trend-feed.xml', 'application/atom+xml');
    } else {
      const feed = generateJSONFeed(filteredPapers, topicRecord);
      downloadFeed(feed, 'academic-trend-feed.json', 'application/json');
    }
  };

  const handleCopyLink = async () => {
    // Generate a static feed URL with selected tags as query params
    // This is a client-side only URL that can be used with the static site
    const baseUrl = window.location.origin + window.location.pathname;
    const feedUrl = `${baseUrl}?tags=${preferences.subscribedTags.join(',')}&format=${preferences.rssFormat}`;
    await copyToClipboard(feedUrl);
    alert('Feed URL copied to clipboard! This URL preserves your selected topics and can be bookmarked or shared.');
  };

  if (topicsLoading || papersLoading || trendsLoading || !prefsLoaded) {
    return <div className="rss-subscription loading">Loading...</div>;
  }

  return (
    <div className="rss-subscription">
      <header>
        <h1>Academic Trend RSS Subscription</h1>
        <p>Subscribe to personalized academic paper feeds based on your interests</p>
      </header>

      <div className="content">
        <section className="topic-selection">
          <h2>Select Topics</h2>
          <TagSelector
            topics={topics}
            subscribedTags={preferences.subscribedTags}
            onToggleTag={toggleTag}
            paperCounts={paperCounts}
          />
        </section>

        <section className="settings">
          <h2>Feed Settings</h2>

          <div className="setting">
            <label>RSS Format:</label>
            <select
              value={preferences.rssFormat}
              onChange={e => updateFormat(e.target.value)}
            >
              <option value="atom">Atom/XML (RSS Readers)</option>
              <option value="json">JSON Feed (Apps)</option>
            </select>
          </div>

          <div className="setting">
            <label>Minimum Match Score: {preferences.minScore.toFixed(1)}</label>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.1"
              value={preferences.minScore}
              onChange={e => updateMinScore(parseFloat(e.target.value))}
              className="slider"
            />
            <span className="slider-labels">
              <span>0.3 (More papers)</span>
              <span>0.9 (Stricter)</span>
            </span>
          </div>

          <div className="setting">
            <label>Digest Mode:</label>
            <select
              value={preferences.digestMode}
              onChange={e => updateDigestMode(e.target.value)}
            >
              <option value="daily">Daily Digest</option>
              <option value="realtime">Real-time (All papers)</option>
            </select>
          </div>

          <div className="preview">
            <h3>Preview</h3>
            <p>Subscribed to: {preferences.subscribedTags.length} topics</p>
            <p>Matching papers (7 days): {filteredPapers.length}</p>
            {weeklyReport && (
              <p>Weekly trend: {weeklyReport.trends.filter(t => preferences.subscribedTags.includes(t.topic_id)).length} topics tracked</p>
            )}
          </div>

          <div className="actions">
            <button
              onClick={handleGenerateRSS}
              disabled={filteredPapers.length === 0}
              className="primary"
            >
              Download Feed
            </button>
            <button
              onClick={handleCopyLink}
              disabled={preferences.subscribedTags.length === 0}
            >
              Copy Subscription Link
            </button>
          </div>
        </section>

        {weeklyReport && (
          <section className="trends">
            <h2>Weekly Trends</h2>
            <div className="trend-list">
              {weeklyReport.trends
                .filter(t => preferences.subscribedTags.includes(t.topic_id))
                .slice(0, 10)
                .map(trend => (
                  <div key={trend.topic_id} className={`trend-item ${trend.trend.direction}`}>
                    <span className="topic-name">{trend.topic_name}</span>
                    <span className="counts">
                      {trend.this_week} this week
                      {trend.last_week > 0 && ` (${trend.trend.direction === 'up' ? '+' : ''}${trend.trend.percent}%)`}
                    </span>
                    <span className={`direction ${trend.trend.direction}`}>
                      {trend.trend.direction === 'up' ? '↑' : trend.trend.direction === 'down' ? '↓' : '→'}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
