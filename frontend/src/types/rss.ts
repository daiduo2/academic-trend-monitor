// frontend/src/types/rss.ts

export interface CompactPaper {
  i: string;    // id
  t: string;    // title
  a: string[];  // authors (max 3)
  c: string;    // category code
  p: string;    // published date (YYMMDD)
  g: number[];  // topic tags
}

export interface CompactTopic {
  n: string;    // name
  k: string[];  // keywords
  l: number;    // layer
  p: string;    // parent category code
}

export interface TopicIndex {
  version: string;
  topics: Record<string, CompactTopic>;
  categories: Record<string, string>;
}

export interface WeeklyTrend {
  topic_id: string;
  topic_name: string;
  category: string;
  this_week: number;
  last_week: number;
  trend: {
    change: number;
    percent: number;
    direction: 'up' | 'down' | 'stable';
  };
}

export interface WeeklyReport {
  week: string;
  generated_at: string;
  total_papers: number;
  trends: WeeklyTrend[];
}

export interface UserPreferences {
  subscribedTags: string[];
  rssFormat: 'atom' | 'json';
  minScore: number;
  digestMode: 'daily' | 'realtime';
  lastSync: string;
}

export interface RSSEntry {
  id: string;
  title: string;
  authors: string[];
  category: string;
  published: string;
  tags: string[];
  link: string;
}
