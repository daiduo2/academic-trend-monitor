function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeCellIndex(value, min, max, count) {
  const span = Math.max(max - min, 1e-6);
  const normalized = (value - min) / span;
  return clamp(Math.floor(normalized * count), 0, count - 1);
}

function normalizeImpactBounds(bounds) {
  const minX = Number(bounds?.minX || 0);
  const maxX = Number(bounds?.maxX || 0);
  const minY = Number(bounds?.minY || 0);
  const maxY = Number(bounds?.maxY || 0);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    maxX: spanX > 1e-6 ? maxX : centerX + 0.5,
    maxY: spanY > 1e-6 ? maxY : centerY + 0.5,
    minX: spanX > 1e-6 ? minX : centerX - 0.5,
    minY: spanY > 1e-6 ? minY : centerY - 0.5,
  };
}

function buildEmptyCells(columns, rows, bounds) {
  const cells = [];
  const cellWidth = (bounds.maxX - bounds.minX) / columns;
  const cellHeight = (bounds.maxY - bounds.minY) / rows;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      cells.push({
        id: `${column}:${row}`,
        column,
        centerX: bounds.minX + ((column + 0.5) * cellWidth),
        centerY: bounds.minY + ((row + 0.5) * cellHeight),
        count: 0,
        impactScore: 0,
        maxCitations: 0,
        meanCitations: 0,
        paperIds: [],
        rawCitationTotal: 0,
        row,
      });
    }
  }

  return cells;
}

export function buildImpactGrid(papers, { bounds, columns = 26, rows = 18 }) {
  const normalizedBounds = normalizeImpactBounds(bounds);
  const cells = buildEmptyCells(columns, rows, normalizedBounds);

  papers.forEach((paper) => {
    const coordinates = paper.coordinates || {};
    const x = Number(coordinates.x);
    const y = Number(coordinates.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    const column = computeCellIndex(x, normalizedBounds.minX, normalizedBounds.maxX, columns);
    const row = computeCellIndex(y, normalizedBounds.minY, normalizedBounds.maxY, rows);
    const cell = cells[(row * columns) + column];
    const citations = Number(paper.citedByCount);
    const safeCitations = Number.isFinite(citations) ? citations : 0;

    cell.paperIds.push(paper.id);
    cell.count += 1;
    cell.rawCitationTotal += safeCitations;
    cell.maxCitations = Math.max(cell.maxCitations, safeCitations);
  });

  cells.forEach((cell) => {
    if (!cell.count) {
      return;
    }

    cell.meanCitations = cell.rawCitationTotal / cell.count;
    cell.impactScore = cell.meanCitations;
  });

  return {
    bounds: normalizedBounds,
    cells,
    columns,
    rows,
  };
}

export function smoothImpactGrid(cells, { columns, rows, radius = 1 }) {
  return cells.map((cell) => {
    const neighborhoodPaperIds = new Set();
    let weightedImpact = 0;
    let weightTotal = 0;
    let neighborhoodCitationTotal = 0;
    let neighborhoodMaxCitations = 0;

    for (
      let row = Math.max(0, cell.row - radius);
      row <= Math.min(rows - 1, cell.row + radius);
      row += 1
    ) {
      for (
        let column = Math.max(0, cell.column - radius);
        column <= Math.min(columns - 1, cell.column + radius);
        column += 1
      ) {
        const neighbor = cells[(row * columns) + column];
        const distance = Math.abs(neighbor.column - cell.column) + Math.abs(neighbor.row - cell.row);
        const weight = distance === 0 ? 1 : 1 / (distance + 1);

        neighbor.paperIds.forEach((paperId) => {
          neighborhoodPaperIds.add(paperId);
        });
        neighborhoodCitationTotal += neighbor.rawCitationTotal || 0;
        neighborhoodMaxCitations = Math.max(neighborhoodMaxCitations, neighbor.maxCitations || 0);
        weightedImpact += neighbor.impactScore * weight;
        weightTotal += weight;
      }
    }

    const neighborhoodPaperCount = neighborhoodPaperIds.size;

    return {
      ...cell,
      neighborhoodMaxCitations,
      neighborhoodMeanCitations: neighborhoodPaperCount
        ? (neighborhoodCitationTotal / neighborhoodPaperCount)
        : 0,
      neighborhoodPaperIds: [...neighborhoodPaperIds],
      smoothedImpact: weightTotal ? (weightedImpact / weightTotal) : 0,
    };
  });
}

export function buildImpactRegionSummary(cell, papersById, { representativeLimit = 5 } = {}) {
  const regionPaperIds = cell.neighborhoodPaperIds?.length ? cell.neighborhoodPaperIds : cell.paperIds;
  const papers = regionPaperIds
    .map((paperId) => papersById[paperId])
    .filter(Boolean);

  const representatives = papers
    .slice()
    .sort((left, right) => right.citedByCount - left.citedByCount)
    .slice(0, representativeLimit);

  const topicCounts = new Map();
  papers.forEach((paper) => {
    const current = topicCounts.get(paper.primaryTopicId) || {
      count: 0,
      label: paper.primaryTopicDisplayName,
      topicId: paper.primaryTopicId,
    };
    current.count += 1;
    topicCounts.set(paper.primaryTopicId, current);
  });

  return {
    maxCitations: cell.neighborhoodMaxCitations ?? cell.maxCitations,
    meanCitations: cell.neighborhoodMeanCitations ?? cell.meanCitations,
    regionPaperCount: papers.length,
    representatives,
    smoothedImpact: cell.smoothedImpact,
    topicMix: [...topicCounts.values()].sort((left, right) => right.count - left.count),
  };
}

export function pickDefaultImpactRegion(cells) {
  if (!cells.length) {
    return null;
  }

  const occupiedCells = cells.filter((cell) => cell.paperIds.length);
  const candidateCells = occupiedCells.length ? occupiedCells : cells;
  const hottestCell = candidateCells
    .slice()
    .sort((left, right) => (right.smoothedImpact || 0) - (left.smoothedImpact || 0))[0];

  return hottestCell?.id || null;
}

export function resolveActiveImpactRegionId(
  cells,
  activeRegionId,
  { forceDefault = false } = {},
) {
  if (!cells.length) {
    return null;
  }

  if (!forceDefault && activeRegionId && cells.some((cell) => cell.id === activeRegionId)) {
    return activeRegionId;
  }

  return pickDefaultImpactRegion(cells);
}

export function projectImpactCellsToCanvas(cells, bounds, size) {
  const normalizedBounds = normalizeImpactBounds(bounds);
  const spanX = Math.max(Number(normalizedBounds.maxX || 0) - Number(normalizedBounds.minX || 0), 1e-6);
  const spanY = Math.max(Number(normalizedBounds.maxY || 0) - Number(normalizedBounds.minY || 0), 1e-6);
  const columns = Math.max(...cells.map((cell) => Number(cell.column) + 1), 1);
  const rows = Math.max(...cells.map((cell) => Number(cell.row) + 1), 1);
  const renderWidth = Math.max((Number(size?.width || 0) / columns) * 0.9, 12);
  const renderHeight = Math.max((Number(size?.height || 0) / rows) * 0.9, 12);

  return cells.map((cell) => ({
    ...cell,
    renderHeight,
    renderWidth,
    renderX: ((cell.centerX - normalizedBounds.minX) / spanX) * size.width,
    renderY: size.height - (((cell.centerY - normalizedBounds.minY) / spanY) * size.height),
  }));
}

export function findNearestImpactCell(cells, screenX, screenY) {
  let bestMatch = null;

  cells.forEach((cell) => {
    if (!cell.paperIds?.length && !cell.neighborhoodPaperIds?.length) {
      return;
    }

    const deltaX = cell.renderX - screenX;
    const deltaY = cell.renderY - screenY;
    const normalizedDistance = (
      ((deltaX ** 2) / ((Math.max(cell.renderWidth || 0, 12) / 2) ** 2))
      + ((deltaY ** 2) / ((Math.max(cell.renderHeight || 0, 12) / 2) ** 2))
    );

    if (normalizedDistance > 1.25) {
      return;
    }

    if (!bestMatch || normalizedDistance < bestMatch.normalizedDistance) {
      bestMatch = {
        ...cell,
        normalizedDistance,
      };
    }
  });

  return bestMatch;
}
