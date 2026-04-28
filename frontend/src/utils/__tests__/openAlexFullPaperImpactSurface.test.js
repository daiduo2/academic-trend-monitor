import { describe, expect, it } from 'vitest';
import {
  buildImpactGrid,
  buildImpactRegionSummary,
  findNearestImpactCell,
  pickDefaultImpactRegion,
  projectImpactCellsToCanvas,
  resolveActiveImpactRegionId,
  smoothImpactGrid,
} from '../openAlexFullPaperImpactSurface';

const SAMPLE_PAPERS = [
  {
    id: 'W1',
    title: 'Bayesian Survey Inference',
    workId: 'W1',
    primaryTopicDisplayName: 'Statistical Methods and Bayesian Inference',
    primaryTopicId: 'T10243',
    publicationYear: 2025,
    citedByCount: 4,
    coordinates: { x: -0.8, y: 0.1 },
  },
  {
    id: 'W2',
    title: 'Bartlett Corrections',
    workId: 'W2',
    primaryTopicDisplayName: 'Statistical Methods and Bayesian Inference',
    primaryTopicId: 'T10243',
    publicationYear: 2025,
    citedByCount: 28,
    coordinates: { x: -0.74, y: 0.14 },
  },
  {
    id: 'W3',
    title: 'Mathematics Teaching Methods',
    workId: 'W3',
    primaryTopicDisplayName: 'Mathematics Education and Pedagogy',
    primaryTopicId: 'T12522',
    publicationYear: 2025,
    citedByCount: 7,
    coordinates: { x: 0.75, y: 0.9 },
  },
];

describe('openAlexFullPaperImpactSurface', () => {
  it('groups papers into regular cells and computes raw citation stats', () => {
    const grid = buildImpactGrid(SAMPLE_PAPERS, {
      bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
      columns: 4,
      rows: 4,
    });

    const occupiedCells = grid.cells.filter((cell) => cell.paperIds.length);
    expect(occupiedCells).toHaveLength(2);
    expect(occupiedCells.find((cell) => cell.paperIds.includes('W1'))).toMatchObject({
      count: 2,
      meanCitations: 16,
      maxCitations: 28,
    });
  });

  it('skips malformed coordinates and neutralizes non-finite citation values', () => {
    const grid = buildImpactGrid([
      {
        id: 'W1',
        citedByCount: 5,
        coordinates: { x: 0, y: 0 },
      },
      {
        id: 'W2',
        citedByCount: Number.POSITIVE_INFINITY,
        coordinates: { x: 0.5, y: 0.5 },
      },
      {
        id: 'W3',
        citedByCount: 11,
        coordinates: { x: Number.NaN, y: 0.1 },
      },
    ], {
      bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
      columns: 4,
      rows: 4,
    });

    const occupiedCells = grid.cells.filter((cell) => cell.paperIds.length);
    expect(occupiedCells).toHaveLength(2);
    expect(occupiedCells.find((cell) => cell.paperIds.includes('W1'))).toMatchObject({
      count: 1,
      meanCitations: 5,
      maxCitations: 5,
    });
    expect(occupiedCells.find((cell) => cell.paperIds.includes('W2'))).toMatchObject({
      count: 1,
      meanCitations: 0,
      maxCitations: 0,
    });
  });

  it('smooths neighboring cell values without changing the occupied-paper inventory', () => {
    const grid = buildImpactGrid(SAMPLE_PAPERS, {
      bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
      columns: 4,
      rows: 4,
    });

    const smoothed = smoothImpactGrid(grid.cells, {
      columns: grid.columns,
      rows: grid.rows,
      radius: 1,
    });

    expect(smoothed.find((cell) => cell.paperIds.includes('W1')).smoothedImpact).toBeGreaterThan(0);
    expect(smoothed.find((cell) => cell.paperIds.includes('W3')).paperIds).toEqual(['W3']);
  });

  it('builds a ranked region evidence summary from the selected cell', () => {
    const grid = buildImpactGrid(SAMPLE_PAPERS, {
      bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
      columns: 4,
      rows: 4,
    });
    const smoothed = smoothImpactGrid(grid.cells, {
      columns: grid.columns,
      rows: grid.rows,
      radius: 1,
    });

    const summary = buildImpactRegionSummary(
      smoothed.find((cell) => cell.paperIds.includes('W1')),
      Object.fromEntries(SAMPLE_PAPERS.map((paper) => [paper.id, paper])),
      { representativeLimit: 2 },
    );

    expect(summary.regionPaperCount).toBe(2);
    expect(summary.representatives.map((paper) => paper.id)).toEqual(['W2', 'W1']);
    expect(summary.topicMix).toEqual([
      { topicId: 'T10243', label: 'Statistical Methods and Bayesian Inference', count: 2 },
    ]);
  });

  it('builds region evidence from the full smoothed neighborhood rather than only the raw cell bin', () => {
    const papers = [
      {
        id: 'A',
        title: 'Cell Anchor',
        workId: 'A',
        primaryTopicDisplayName: 'Topic A',
        primaryTopicId: 'TA',
        publicationYear: 2024,
        citedByCount: 10,
        coordinates: { x: -0.6, y: 0.0 },
      },
      {
        id: 'B',
        title: 'Neighbor Evidence',
        workId: 'B',
        primaryTopicDisplayName: 'Topic B',
        primaryTopicId: 'TB',
        publicationYear: 2025,
        citedByCount: 40,
        coordinates: { x: -0.1, y: 0.0 },
      },
    ];
    const grid = buildImpactGrid(papers, {
      bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
      columns: 4,
      rows: 4,
    });
    const smoothed = smoothImpactGrid(grid.cells, {
      columns: grid.columns,
      rows: grid.rows,
      radius: 1,
    });

    const summary = buildImpactRegionSummary(
      smoothed.find((cell) => cell.paperIds.includes('A')),
      Object.fromEntries(papers.map((paper) => [paper.id, paper])),
      { representativeLimit: 3 },
    );

    expect(summary.regionPaperCount).toBe(2);
    expect(summary.meanCitations).toBe(25);
    expect(summary.maxCitations).toBe(40);
    expect(summary.representatives.map((paper) => paper.id)).toEqual(['B', 'A']);
    expect(summary.topicMix).toEqual([
      { topicId: 'TA', label: 'Topic A', count: 1 },
      { topicId: 'TB', label: 'Topic B', count: 1 },
    ]);
  });

  it('keeps the summary region count coherent when papersById is incomplete', () => {
    const grid = buildImpactGrid(SAMPLE_PAPERS, {
      bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
      columns: 4,
      rows: 4,
    });
    const smoothed = smoothImpactGrid(grid.cells, {
      columns: grid.columns,
      rows: grid.rows,
      radius: 1,
    });

    const summary = buildImpactRegionSummary(
      smoothed.find((cell) => cell.paperIds.includes('W1')),
      { W1: SAMPLE_PAPERS[0] },
      { representativeLimit: 2 },
    );

    expect(summary.regionPaperCount).toBe(1);
    expect(summary.representatives.map((paper) => paper.id)).toEqual(['W1']);
    expect(summary.topicMix).toEqual([
      { topicId: 'T10243', label: 'Statistical Methods and Bayesian Inference', count: 1 },
    ]);
  });

  it('projects cells to canvas coordinates and picks the nearest visible region', () => {
    const papers = [
      {
        id: 'A',
        title: 'A',
        workId: 'A',
        primaryTopicDisplayName: 'Topic A',
        primaryTopicId: 'TA',
        publicationYear: 2024,
        citedByCount: 120,
        coordinates: { x: -0.6, y: 0.0 },
      },
      {
        id: 'B',
        title: 'B',
        workId: 'B',
        primaryTopicDisplayName: 'Topic A',
        primaryTopicId: 'TA',
        publicationYear: 2025,
        citedByCount: 90,
        coordinates: { x: -0.55, y: 0.04 },
      },
      {
        id: 'C',
        title: 'C',
        workId: 'C',
        primaryTopicDisplayName: 'Topic B',
        primaryTopicId: 'TB',
        publicationYear: 2025,
        citedByCount: 8,
        coordinates: { x: 0.7, y: 0.8 },
      },
    ];
    const grid = buildImpactGrid(papers, {
      bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
      columns: 6,
      rows: 4,
    });
    const cells = smoothImpactGrid(grid.cells, { columns: 6, rows: 4, radius: 1 });
    const projected = projectImpactCellsToCanvas(cells, grid.bounds, {
      width: 1200,
      height: 720,
    });
    const hotRegion = projected.slice().sort((left, right) => right.smoothedImpact - left.smoothedImpact)[0];
    const picked = findNearestImpactCell(projected, hotRegion.renderX + 4, hotRegion.renderY + 6);

    expect(projected).toHaveLength(24);
    expect(hotRegion.renderX).toBeGreaterThan(0);
    expect(hotRegion.renderY).toBeGreaterThan(0);
    expect(picked?.id).toBe(hotRegion.id);
  });

  it('inflates degenerate bounds so one-paper cohorts project away from the canvas corner', () => {
    const grid = buildImpactGrid([
      {
        id: 'solo',
        title: 'Solo Paper',
        workId: 'solo',
        primaryTopicDisplayName: 'Topic Solo',
        primaryTopicId: 'TS',
        publicationYear: 2025,
        citedByCount: 5,
        coordinates: { x: 2, y: 3 },
      },
    ], {
      bounds: { minX: 2, maxX: 2, minY: 3, maxY: 3 },
      columns: 4,
      rows: 4,
    });
    const smoothed = smoothImpactGrid(grid.cells, {
      columns: grid.columns,
      rows: grid.rows,
      radius: 1,
    });
    const projected = projectImpactCellsToCanvas(smoothed, grid.bounds, {
      width: 1200,
      height: 720,
    });
    const occupiedCell = projected.find((cell) => cell.paperIds.includes('solo'));

    expect(occupiedCell.renderX).toBeGreaterThan(120);
    expect(occupiedCell.renderX).toBeLessThan(1080);
    expect(occupiedCell.renderY).toBeGreaterThan(120);
    expect(occupiedCell.renderY).toBeLessThan(600);
  });

  it('picks the default impact region from the hottest occupied cell', () => {
    const grid = buildImpactGrid(SAMPLE_PAPERS, {
      bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
      columns: 4,
      rows: 4,
    });
    const smoothed = smoothImpactGrid(grid.cells, {
      columns: grid.columns,
      rows: grid.rows,
      radius: 1,
    });

    expect(pickDefaultImpactRegion(smoothed)).toBe(
      smoothed.find((cell) => cell.paperIds.includes('W1'))?.id,
    );
  });

  it('resets the active impact region to the default when the cohort changes', () => {
    const previousGrid = buildImpactGrid(SAMPLE_PAPERS, {
      bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
      columns: 4,
      rows: 4,
    });
    const previousCells = smoothImpactGrid(previousGrid.cells, {
      columns: previousGrid.columns,
      rows: previousGrid.rows,
      radius: 1,
    });
    const previousRegionId = previousCells.find((cell) => cell.paperIds.includes('W3'))?.id;

    const nextGrid = buildImpactGrid(SAMPLE_PAPERS.slice(0, 2), {
      bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
      columns: 4,
      rows: 4,
    });
    const nextCells = smoothImpactGrid(nextGrid.cells, {
      columns: nextGrid.columns,
      rows: nextGrid.rows,
      radius: 1,
    });

    expect(resolveActiveImpactRegionId(nextCells, previousRegionId, { forceDefault: true })).toBe(
      pickDefaultImpactRegion(nextCells),
    );
  });

  it('ignores empty smoothed cells when picking the nearest impact region', () => {
    const picked = findNearestImpactCell([
      {
        id: 'empty-cell',
        neighborhoodPaperIds: [],
        paperIds: [],
        renderHeight: 30,
        renderWidth: 30,
        renderX: 100,
        renderY: 100,
      },
      {
        id: 'occupied-cell',
        paperIds: ['W1'],
        renderHeight: 30,
        renderWidth: 30,
        renderX: 116,
        renderY: 112,
      },
    ], 105, 104);

    expect(picked?.id).toBe('occupied-cell');
  });

  it('allows picking a smoothed empty cell when it carries neighborhood evidence', () => {
    const picked = findNearestImpactCell([
      {
        id: 'smoothed-region',
        neighborhoodPaperIds: ['W1', 'W2'],
        paperIds: [],
        renderHeight: 30,
        renderWidth: 30,
        renderX: 100,
        renderY: 100,
      },
      {
        id: 'farther-occupied-cell',
        neighborhoodPaperIds: ['W3'],
        paperIds: ['W3'],
        renderHeight: 30,
        renderWidth: 30,
        renderX: 140,
        renderY: 140,
      },
    ], 104, 103);

    expect(picked?.id).toBe('smoothed-region');
  });
});
