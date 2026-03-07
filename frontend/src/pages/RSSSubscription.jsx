// frontend/src/pages/RSSSubscription.jsx
import React, { useMemo, useEffect } from 'react';
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
  const { preferences, loaded: prefsLoaded, toggleTag, updateFormat, updateMinScore, updateDigestMode, setPreferences } = usePreferences();

  // Read URL params on mount to restore shared subscription config
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tagsParam = params.get('tags');
    const formatParam = params.get('format');

    if (tagsParam) {
      const tags = tagsParam.split(',').filter(Boolean);
      // Restore tags from URL
      if (tags.length > 0) {
        setPreferences(prev => ({ ...prev, subscribedTags: tags }));
      }
    }

    if (formatParam && ['atom', 'json'].includes(formatParam)) {
      setPreferences(prev => ({ ...prev, rssFormat: formatParam }));
    }
  }, [setPreferences]);

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
    alert('订阅链接已复制到剪贴板！此链接保存了您的主题选择，可以收藏或分享。');
  };

  if (topicsLoading || papersLoading || trendsLoading || !prefsLoaded) {
    return <div className="rss-subscription loading">加载中...</div>;
  }

  return (
    <div className="rss-subscription">
      <header>
        <h1>学术趋势 RSS 订阅</h1>
        <p>根据您的兴趣订阅个性化学术论文推送</p>
      </header>

      <div className="content">
        <section className="topic-selection">
          <h2>选择主题</h2>
          <TagSelector
            topics={topics}
            subscribedTags={preferences.subscribedTags}
            onToggleTag={toggleTag}
            paperCounts={paperCounts}
          />
        </section>

        <section className="settings">
          <h2>订阅设置</h2>

          <div className="setting">
            <label>RSS 格式：</label>
            <select
              value={preferences.rssFormat}
              onChange={e => updateFormat(e.target.value)}
            >
              <option value="atom">Atom/XML (RSS 阅读器)</option>
              <option value="json">JSON Feed (应用程序)</option>
            </select>
          </div>

          <div className="setting">
            <label>最低匹配分数：{preferences.minScore.toFixed(1)}</label>
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
              <span>0.3 (更多论文)</span>
              <span>0.9 (更严格)</span>
            </span>
          </div>

          <div className="setting">
            <label>推送模式：</label>
            <select
              value={preferences.digestMode}
              onChange={e => updateDigestMode(e.target.value)}
            >
              <option value="daily">每日摘要</option>
              <option value="realtime">实时推送 (全部论文)</option>
            </select>
          </div>

          <div className="preview">
            <h3>预览</h3>
            <p>已订阅主题：{preferences.subscribedTags.length} 个</p>
            <p>匹配论文 (7天)：{filteredPapers.length} 篇</p>
            {weeklyReport && (
              <p>周趋势跟踪：{weeklyReport.trends.filter(t => preferences.subscribedTags.includes(t.topic_id)).length} 个主题</p>
            )}
          </div>

          <div className="actions">
            <button
              onClick={handleGenerateRSS}
              disabled={filteredPapers.length === 0}
              className="primary"
            >
              下载订阅源
            </button>
            <button
              onClick={handleCopyLink}
              disabled={preferences.subscribedTags.length === 0}
            >
              复制订阅链接
            </button>
          </div>
        </section>

        {weeklyReport && (
          <section className="trends">
            <h2>近期趋势 (7天滚动)</h2>
            {weeklyReport.period && (
              <p className="period-label">时间段：{weeklyReport.period}</p>
            )}
            <div className="trend-list">
              {weeklyReport.trends
                .filter(t => preferences.subscribedTags.includes(t.topic_id))
                .slice(0, 10)
                .map(trend => (
                  <div key={trend.topic_id} className={`trend-item ${trend.trend.direction}`}>
                    <span className="topic-name">{trend.topic_name}</span>
                    <span className="counts">
                      {trend.this_period ?? trend.this_week} 近期
                      {(trend.last_period ?? trend.last_week) > 0 && ` (${trend.trend.direction === 'up' ? '+' : ''}${trend.trend.percent}%)`}
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
