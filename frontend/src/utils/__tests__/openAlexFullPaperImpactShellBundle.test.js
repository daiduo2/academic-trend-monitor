import { describe, expect, it } from 'vitest';
import {
  buildOpenAlexFullPaperImpactShellPath,
  normalizeOpenAlexFullPaperImpactShellBundle,
} from '../openAlexFullPaperImpactShellBundle';

const SAMPLE_BUNDLE = {
  mesh: {
    indices: ['0', '1', '2'],
    normals: ['0', '0', '1'],
    positions: ['1.5', '-2', '0'],
    vertexImpact: ['0.75'],
    vertexLift: ['0.12'],
  },
  meta: {
    buildVersion: 'openalex_full_paper_impact_shell_v1',
    bounds: {
      maxX: 1,
      maxY: 2,
      maxZ: 3,
      minX: -1,
      minY: -2,
      minZ: -3,
    },
  },
  regions: [
    {
      centroid: { x: '0.5', y: '-0.25', z: '1.25' },
      id: 'shell-region-0',
      impactScore: '0.75',
      paperIds: ['W1', 'W2'],
      summary: {
        localRelativeHeat: '0.75',
        maxCitations: '12',
        meanCitations: '7.5',
        regionPaperCount: '2',
      },
      topicMix: [
        {
          paperCount: '2',
          share: '1',
          topicDisplayName: 'Topic Alpha',
          topicId: 'TA',
        },
      ],
      vertexCount: '3',
      vertexIndices: ['0', '2'],
    },
  ],
};

describe('openAlexFullPaperImpactShellBundle', () => {
  it('builds the shell bridge path under the app base path', () => {
    expect(buildOpenAlexFullPaperImpactShellPath('/academic-trend-monitor/')).toBe(
      '/academic-trend-monitor/__openalex-full-paper-impact-shell',
    );
  });

  it('normalizes shell bundles into frontend-ready collections', () => {
    const normalized = normalizeOpenAlexFullPaperImpactShellBundle(SAMPLE_BUNDLE);

    expect(normalized.mesh).toMatchObject({
      indices: [0, 1, 2],
      normals: [0, 0, 1],
      positions: [1.5, -2, 0],
      vertexImpact: [0.75],
      vertexLift: [0.12],
    });
    expect(normalized.regions).toHaveLength(1);
    expect(normalized.regionById['shell-region-0']).toEqual(normalized.regions[0]);
    expect(normalized.regions[0]).toMatchObject({
      centroid: { x: 0.5, y: -0.25, z: 1.25 },
      id: 'shell-region-0',
      impactScore: 0.75,
      paperIds: ['W1', 'W2'],
      summary: {
        localRelativeHeat: 0.75,
        maxCitations: 12,
        meanCitations: 7.5,
        regionPaperCount: 2,
      },
      topicMix: [
        {
          paperCount: 2,
          share: 1,
          topicDisplayName: 'Topic Alpha',
          topicId: 'TA',
        },
      ],
      vertexCount: 3,
      vertexIndices: [0, 2],
    });
  });

  it('fails closed when mesh numeric arrays contain malformed values', () => {
    const normalized = normalizeOpenAlexFullPaperImpactShellBundle({
      ...SAMPLE_BUNDLE,
      mesh: {
        indices: ['0', '1', 'bad'],
        normals: ['0', '1'],
        positions: ['1.5', 'oops', '0'],
        vertexImpact: ['0.75', 'bad'],
        vertexLift: ['0.12', 'NaN'],
      },
    });

    expect(normalized.mesh).toMatchObject({
      indices: [],
      normals: [],
      positions: [],
      vertexImpact: [],
      vertexLift: [],
    });
  });

  it('fails closed when region vertex indices contain malformed values', () => {
    const normalized = normalizeOpenAlexFullPaperImpactShellBundle({
      ...SAMPLE_BUNDLE,
      regions: [
        {
          ...SAMPLE_BUNDLE.regions[0],
          vertexIndices: ['0', 'bad', '2'],
        },
      ],
    });

    expect(normalized.regions[0].vertexIndices).toEqual([]);
    expect(normalized.regionById['shell-region-0'].vertexIndices).toEqual([]);
  });
});
