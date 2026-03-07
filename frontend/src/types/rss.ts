// frontend/src/types/rss.ts

export interface CompactPaper {
  i: string;    // id
  t: string;    // title
  a: string[];  // authors (max 3)
  c: string;    // category code
  p: string;    // published date (YYMMDD)
  g: number[];  // topic tags
  s?: number[]; // scores for each tag (optional for backward compatibility)
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
  this_week: number;  // Kept for backward compatibility
  last_week: number;  // Kept for backward compatibility
  this_period?: number;  // Rolling 7-day window
  last_period?: number;  // Previous 7-day window
  trend: {
    change: number;
    percent: number;
    direction: 'up' | 'down' | 'stable';
  };
}

export interface WeeklyReport {
  period?: string;      // Rolling window label (e.g., "03/01-03/07")
  week: string;         // Kept for backward compatibility
  generated_at: string;
  total_papers: number;
  window_days?: number; // Size of rolling window (default: 7)
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
