const OPENALEX_FULL_PAPER_EMBEDDINGS_ENDPOINT = '__openalex-full-paper-embeddings-baseline';
export const OPENALEX_FULL_PAPER_ALL_TOPICS = 'all';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function computeCoordinateBounds(papers, coordinateField, dimensions = 2) {
  if (!papers.length) {
    const emptyBounds = {
      maxX: 1,
      maxY: 1,
      minX: -1,
      minY: -1,
    };

    if (dimensions === 3) {
      emptyBounds.maxZ = 1;
      emptyBounds.minZ = -1;
    }

    return emptyBounds;
  }

  return papers.reduce((bounds, paper) => {
    const coordinates = paper[coordinateField] || {};

    const nextBounds = {
      maxX: Math.max(bounds.maxX, Number(coordinates.x || 0)),
      maxY: Math.max(bounds.maxY, Number(coordinates.y || 0)),
      minX: Math.min(bounds.minX, Number(coordinates.x || 0)),
      minY: Math.min(bounds.minY, Number(coordinates.y || 0)),
    };

    if (dimensions === 3) {
      nextBounds.maxZ = Math.max(bounds.maxZ, Number(coordinates.z || 0));
      nextBounds.minZ = Math.min(bounds.minZ, Number(coordinates.z || 0));
    }

    return nextBounds;
  }, {
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    ...(dimensions === 3 ? {
      maxZ: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
    } : {}),
  });
}

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function normalizeLexicalSearchValue(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function hslToHex(hue, saturation, lightness) {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs((2 * l) - 1)) * s;
  const hh = hue / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hh >= 0 && hh < 1) {
    red = c;
    green = x;
  } else if (hh >= 1 && hh < 2) {
    red = x;
    green = c;
  } else if (hh >= 2 && hh < 3) {
    green = c;
    blue = x;
  } else if (hh >= 3 && hh < 4) {
    green = x;
    blue = c;
  } else if (hh >= 4 && hh < 5) {
    red = x;
    blue = c;
  } else {
    red = c;
    blue = x;
  }

  const match = l - (c / 2);
  const toHex = (channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0');

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

export function buildOpenAlexFullPaperEmbeddingsPath(basePath = '/') {
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}${OPENALEX_FULL_PAPER_EMBEDDINGS_ENDPOINT}`;
}

export function computeOpenAlexFullPaperCoordinateBounds(papers) {
  return computeCoordinateBounds(papers, 'coordinates');
}

export function computeOpenAlexFullPaperCoordinateBounds3d(papers) {
  return computeCoordinateBounds(papers, 'coordinates3d', 3);
}

export function getOpenAlexFullPaperTopicColor(topicId) {
  const normalizedId = String(topicId || 'unknown-topic');
  const hue = hashString(normalizedId) % 360;
  const saturation = 58 + (hashString(`${normalizedId}:s`) % 18);
  const lightness = 44 + (hashString(`${normalizedId}:l`) % 12);

  return hslToHex(hue, saturation, lightness);
}

export function filterOpenAlexFullPaperEmbeddings(bundle, topicId = OPENALEX_FULL_PAPER_ALL_TOPICS) {
  if (!bundle) {
    return [];
  }

  if (!topicId || topicId === OPENALEX_FULL_PAPER_ALL_TOPICS) {
    return bundle.papers;
  }

  return bundle.papersByPrimaryTopicId[topicId] || [];
}

export function searchOpenAlexFullPaperEmbeddings(papers, query, limit = 8) {
  const normalizedQuery = normalizeLexicalSearchValue(query);
  if (!normalizedQuery) {
    return [];
  }

  const queryTerms = normalizedQuery.split(' ').filter(Boolean);
  const normalizedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 8;

  return asArray(papers)
    .map((paper) => {
      const title = normalizeLexicalSearchValue(paper?.title);
      const workId = normalizeLexicalSearchValue(paper?.workId || paper?.id);
      const searchText = normalizeLexicalSearchValue(paper?.searchText || paper?.title);
      const combined = `${title} ${workId} ${searchText}`.trim();

      if (!combined || !queryTerms.every((term) => combined.includes(term))) {
        return null;
      }

      let score = 100;

      if (workId === normalizedQuery) {
        score += 1200;
      } else if (workId.startsWith(normalizedQuery)) {
        score += 960;
      } else if (workId.includes(normalizedQuery)) {
        score += 780 - Math.min(workId.indexOf(normalizedQuery), 50);
      }

      if (title === normalizedQuery) {
        score += 920;
      } else if (title.startsWith(normalizedQuery)) {
        score += 740;
      } else if (title.includes(normalizedQuery)) {
        score += 560 - Math.min(title.indexOf(normalizedQuery), 80);
      } else if (searchText.includes(normalizedQuery)) {
        score += 440 - Math.min(searchText.indexOf(normalizedQuery), 80);
      }

      score += Math.max(0, 36 - Math.floor(title.length / 12));

      return {
        paper,
        score,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const leftYear = Number(left.paper.publicationYear || 0);
      const rightYear = Number(right.paper.publicationYear || 0);
      if (rightYear !== leftYear) {
        return rightYear - leftYear;
      }

      const titleOrder = left.paper.title.localeCompare(right.paper.title);
      if (titleOrder !== 0) {
        return titleOrder;
      }

      return left.paper.workId.localeCompare(right.paper.workId);
    })
    .slice(0, normalizedLimit)
    .map((entry) => entry.paper);
}

export function normalizeOpenAlexFullPaperEmbeddingsBundle(bundle) {
  const papers = asArray(bundle?.papers).map((paper) => ({
    citedByCount: Number(paper?.cited_by_count || 0),
    coordinates: {
      x: Number(paper?.coordinates?.x || 0),
      y: Number(paper?.coordinates?.y || 0),
    },
    coordinates3d: {
      x: Number(paper?.coordinates_3d?.x ?? paper?.coordinates?.x ?? 0),
      y: Number(paper?.coordinates_3d?.y ?? paper?.coordinates?.y ?? 0),
      z: Number(paper?.coordinates_3d?.z || 0),
    },
    id: String(paper?.work_id || ''),
    primaryTopicDisplayName: String(paper?.primary_topic_display_name || paper?.primary_topic_id || 'Unknown topic'),
    primaryTopicId: String(paper?.primary_topic_id || 'unknown-topic'),
    publicationYear: Number(paper?.publication_year || 0) || null,
    searchText: String(paper?.search_text || paper?.title || '').trim(),
    title: String(paper?.title || paper?.work_id || '').trim(),
    workId: String(paper?.work_id || ''),
  }));

  const papersById = Object.fromEntries(papers.map((paper) => [paper.id, paper]));
  const papersByPrimaryTopicId = papers.reduce((groups, paper) => {
    if (!groups[paper.primaryTopicId]) {
      groups[paper.primaryTopicId] = [];
    }
    groups[paper.primaryTopicId].push(paper);
    return groups;
  }, {});

  const topicOptions = Object.entries(papersByPrimaryTopicId)
    .map(([topicId, topicPapers]) => {
      const label = topicPapers[0]?.primaryTopicDisplayName || topicId;
      return {
        color: getOpenAlexFullPaperTopicColor(topicId),
        count: topicPapers.length,
        label,
        value: topicId,
      };
    })
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.label.localeCompare(right.label);
    });

  const topicColorById = Object.fromEntries(topicOptions.map((option) => [option.value, option.color]));

  return {
    availableViewModes: papers.some((paper) => Number.isFinite(paper.coordinates3d.z))
      ? ['3d', '2d']
      : ['2d'],
    bundleVersion: bundle?.version || '',
    coordinateBounds2d: computeOpenAlexFullPaperCoordinateBounds(papers),
    coordinateBounds3d: computeOpenAlexFullPaperCoordinateBounds3d(papers),
    generatedAt: bundle?.generated_at || '',
    model: bundle?.model || {},
    papers,
    papersById,
    papersByPrimaryTopicId,
    projection: bundle?.projection || {},
    source: bundle?.source || {},
    stats: bundle?.stats || {},
    topicColorById,
    topicOptions: [
      {
        color: '#cbd5e1',
        count: papers.length,
        label: 'All topics',
        value: OPENALEX_FULL_PAPER_ALL_TOPICS,
      },
      ...topicOptions,
    ],
    version: bundle?.version || '',
  };
}
