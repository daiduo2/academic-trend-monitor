// frontend/src/utils/rssGenerator.ts
import type { CompactPaper, CompactTopic, RSSEntry } from '../types/rss';

function formatDate(dateStr: string): string {
  // Convert YYMMDD to ISO date
  const year = '20' + dateStr.slice(0, 2);
  const month = dateStr.slice(2, 4);
  const day = dateStr.slice(4, 6);
  return new Date(`${year}-${month}-${day}`).toISOString();
}

function paperToRSSEntry(paper: CompactPaper, topics: Record<string, CompactTopic>): RSSEntry {
  const categoryMap: Record<string, string> = {
    'AI': 'cs.AI',
    'CV': 'cs.CV',
    'CL': 'cs.CL',
    'LG': 'cs.LG',
  };

  return {
    id: paper.i,
    title: paper.t,
    authors: paper.a,
    category: categoryMap[paper.c] || `cs.${paper.c}`,
    published: formatDate(paper.p),
    tags: paper.g.map(tagId => topics[tagId]?.n || `主题 ${tagId}`),
    link: `https://arxiv.org/abs/${paper.i}`,
  };
}

export function generateAtomFeed(
  papers: CompactPaper[],
  topics: Record<string, CompactTopic>,
  options: { title?: string; description?: string } = {}
): string {
  const { title = '学术趋势监测', description = '个性化学术论文 RSS 订阅源' } = options;
  const now = new Date().toISOString();

  const entries = papers.map(paper => {
    const entry = paperToRSSEntry(paper, topics);
    return `
    <entry>
      <title>${escapeXml(entry.title)}</title>
      <id>${entry.link}</id>
      <link href="${entry.link}" />
      <published>${entry.published}</published>
      <updated>${entry.published}</updated>
      <author>
        <name>${entry.authors.join(', ')}</name>
      </author>
      <category term="${entry.category}" />
      ${entry.tags.map(tag => `<category term="${escapeXml(tag)}" />`).join('\n      ')}
    </entry>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(title)}</title>
  <subtitle>${escapeXml(description)}</subtitle>
  <link href="https://your-github-pages-url/rss.xml" rel="self" />
  <updated>${now}</updated>
  <id>urn:uuid:academic-trend-monitor</id>
  ${entries}
</feed>`;
}

export function generateJSONFeed(
  papers: CompactPaper[],
  topics: Record<string, CompactTopic>,
  options: { title?: string; description?: string } = {}
): string {
  const { title = '学术趋势监测', description = '个性化学术论文 RSS 订阅源' } = options;

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title,
    description,
    home_page_url: 'https://your-github-pages-url',
    feed_url: 'https://your-github-pages-url/feed.json',
    items: papers.map(paper => {
      const entry = paperToRSSEntry(paper, topics);
      return {
        id: entry.id,
        title: entry.title,
        content_text: `作者: ${entry.authors.join(', ')}\n分类: ${entry.tags.join(', ')}`,
        url: entry.link,
        date_published: entry.published,
        authors: entry.authors.map(name => ({ name })),
        tags: entry.tags,
      };
    }),
  };

  return JSON.stringify(feed, null, 2);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadFeed(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
