const OPENALEX_TOPIC_PAPER_EMBEDDINGS_ENDPOINT = '__openalex-paper-embeddings-pilot';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const text = String(value || '').trim();
    if (!text) {
      return;
    }
    const normalized = normalizeText(text);
    if (seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    result.push(text);
  });

  return result;
}

function extractAbstractText(title, searchText) {
  const normalizedTitle = String(title || '').trim();
  const normalizedSearchText = String(searchText || '').trim();
  if (!normalizedTitle || !normalizedSearchText) {
    return '';
  }

  const prefix = `${normalizedTitle}. Abstract: `;
  if (normalizedSearchText.startsWith(prefix)) {
    return normalizedSearchText.slice(prefix.length).trim();
  }

  return normalizedSearchText === normalizedTitle ? '' : normalizedSearchText;
}

function computeCoordinateBounds(papers, coordinateField) {
  if (!papers.length) {
    return {
      maxX: 1,
      maxY: 1,
      maxZ: 1,
      minX: -1,
      minY: -1,
      minZ: -1,
    };
  }

  return papers.reduce((bounds, paper) => {
    const coordinates = paper[coordinateField] || {};

    return {
      maxX: Math.max(bounds.maxX, Number(coordinates.x || 0)),
      maxY: Math.max(bounds.maxY, Number(coordinates.y || 0)),
      maxZ: Math.max(bounds.maxZ, Number(coordinates.z || 0)),
      minX: Math.min(bounds.minX, Number(coordinates.x || 0)),
      minY: Math.min(bounds.minY, Number(coordinates.y || 0)),
      minZ: Math.min(bounds.minZ, Number(coordinates.z || 0)),
    };
  }, {
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
  });
}

function scorePaperSearchMatch(paper, normalizedQuery) {
  if (!normalizedQuery) {
    return 0;
  }

  const title = normalizeText(paper.title);
  const workId = normalizeText(paper.workId);
  const searchBlob = paper.searchBlob;

  let score = 0;

  if (title === normalizedQuery) {
    score = 1500;
  } else if (workId === normalizedQuery) {
    score = 1425;
  } else if (title.startsWith(normalizedQuery)) {
    score = 1120;
  } else if (title.includes(normalizedQuery)) {
    score = 860;
  } else if (searchBlob.includes(normalizedQuery)) {
    score = 460;
  }

  if (!score) {
    return 0;
  }

  score += Math.min(Number(paper.citedByCount || 0), 100) * 0.1;
  if (paper.abstractAvailable) {
    score += 8;
  }

  return score;
}

export function buildOpenAlexTopicPaperEmbeddingsPath(basePath = '/') {
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}${OPENALEX_TOPIC_PAPER_EMBEDDINGS_ENDPOINT}`;
}

export function normalizeOpenAlexTopicPaperEmbeddingsBundle(bundle) {
  const papers = asArray(bundle?.papers).map((paper) => {
    const title = String(paper?.title || paper?.work_id || '').trim();
    const searchText = String(paper?.search_text || '').trim();
    const abstractText = extractAbstractText(title, searchText);
    const searchParts = uniqueStrings([
      title,
      paper?.work_id,
      searchText,
      abstractText,
      paper?.publication_year,
    ]);

    return {
      abstractAvailable: Boolean(paper?.abstract_available),
      abstractText,
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
      publicationYear: Number(paper?.publication_year || 0) || null,
      searchBlob: searchParts.join(' ').toLowerCase(),
      searchText,
      title,
      workId: String(paper?.work_id || ''),
    };
  });

  const papersById = Object.fromEntries(papers.map((paper) => [paper.id, paper]));
  const coordinateBounds2d = computeCoordinateBounds(papers, 'coordinates');
  const coordinateBounds3d = computeCoordinateBounds(papers, 'coordinates3d');
  const availableViewModes = papers.some((paper) => Number.isFinite(paper.coordinates3d.z))
    ? ['3d', '2d']
    : ['2d'];

  return {
    availableViewModes,
    bundleVersion: bundle?.version || '',
    coordinateBounds2d,
    coordinateBounds3d,
    generatedAt: bundle?.generated_at || '',
    model: bundle?.model || {},
    papers,
    papersById,
    projection: bundle?.projection || {},
    source: bundle?.source || {},
    stats: bundle?.stats || {},
    version: bundle?.version || '',
  };
}

export function rankOpenAlexTopicPaperMatches(
  bundle,
  query,
  {
    limit = 8,
  } = {},
) {
  if (!bundle) {
    return [];
  }

  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  return bundle.papers
    .map((paper) => ({
      matchScore: scorePaperSearchMatch(paper, normalizedQuery),
      paper,
    }))
    .filter((entry) => entry.matchScore > 0)
    .sort((left, right) => {
      if (right.matchScore !== left.matchScore) {
        return right.matchScore - left.matchScore;
      }
      if (right.paper.citedByCount !== left.paper.citedByCount) {
        return right.paper.citedByCount - left.paper.citedByCount;
      }
      return left.paper.title.localeCompare(right.paper.title);
    })
    .slice(0, limit)
    .map(({ paper, matchScore }) => ({
      ...paper,
      matchScore,
    }));
}
