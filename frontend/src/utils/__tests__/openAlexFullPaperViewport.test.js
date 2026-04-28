import { describe, expect, it } from 'vitest';
import {
  buildFullPaperHoverCard,
  pickProjectedFullPaper,
  projectFullPaperToScreen,
} from '../openAlexFullPaperViewport';

const SIZE = { width: 1200, height: 800 };
const BOUNDS_2D = {
  minX: -1,
  maxX: 1,
  minY: -1,
  maxY: 1,
};
const BOUNDS_3D = {
  minX: -1,
  maxX: 1,
  minY: -1,
  maxY: 1,
  minZ: -1,
  maxZ: 1,
};

describe('openAlexFullPaperViewport', () => {
  it('projects 2d papers into visibly larger circular nodes', () => {
    const projected = projectFullPaperToScreen({
      camera: {
        offsetX: 0,
        offsetY: 0,
        scale: 100,
      },
      coordinateBounds2d: BOUNDS_2D,
      coordinateBounds3d: BOUNDS_3D,
      paper: {
        coordinates: { x: 0.25, y: -0.5 },
        coordinates3d: { x: 0.25, y: -0.5, z: 0.1 },
      },
      size: SIZE,
      viewMode: '2d',
    });

    expect(projected.screenX).toBe(625);
    expect(projected.screenY).toBe(450);
    expect(projected.radius).toBeGreaterThanOrEqual(5.5);
  });

  it('projects 3d papers with perspective-scaled radii that stay larger than the old baseline squares', () => {
    const projected = projectFullPaperToScreen({
      camera: {
        distance: 3.2,
        offsetX: 0,
        offsetY: 0,
        pitch: 0.45,
        scale: 260,
        yaw: 0.7,
      },
      coordinateBounds2d: BOUNDS_2D,
      coordinateBounds3d: BOUNDS_3D,
      paper: {
        coordinates: { x: 0.25, y: -0.5 },
        coordinates3d: { x: 0.25, y: -0.5, z: 0.1 },
      },
      size: SIZE,
      viewMode: '3d',
    });

    expect(projected.radius).toBeGreaterThan(4);
    expect(projected.radius).toBeLessThanOrEqual(12);
  });

  it('picks the closest projected paper within the node hit area', () => {
    const hit = pickProjectedFullPaper([
      {
        depth: 0.3,
        paper: { id: 'W1' },
        radius: 6,
        screenX: 180,
        screenY: 220,
      },
      {
        depth: 0.1,
        paper: { id: 'W2' },
        radius: 7,
        screenX: 320,
        screenY: 220,
      },
    ], 184, 224);

    expect(hit?.paper.id).toBe('W1');
    expect(pickProjectedFullPaper([], 184, 224)).toBeNull();
  });

  it('does not pick projected papers that are off-canvas even if the pointer is numerically close', () => {
    const hit = pickProjectedFullPaper([
      {
        depth: 0.2,
        paper: { id: 'OFF' },
        radius: 8,
        screenX: -12,
        screenY: 220,
      },
      {
        depth: 0.1,
        paper: { id: 'ON' },
        radius: 8,
        screenX: 140,
        screenY: 220,
      },
    ], -8, 220, SIZE);

    expect(hit).toBeNull();
  });

  it('prefers the front-most paper when two projected entries are equally close', () => {
    const hit = pickProjectedFullPaper([
      {
        depth: 0.2,
        paper: { id: 'BACK' },
        radius: 8,
        screenX: 200,
        screenY: 200,
      },
      {
        depth: 0.8,
        paper: { id: 'FRONT' },
        radius: 8,
        screenX: 200,
        screenY: 200,
      },
    ], 200, 200, SIZE);

    expect(hit?.paper.id).toBe('FRONT');
  });

  it('builds hover card copy from paper metadata', () => {
    expect(buildFullPaperHoverCard({
      citedByCount: 7,
      publicationYear: 2025,
      title: 'Mathematics Teaching Methods',
    })).toEqual({
      meta: '2025 · cited by 7',
      title: 'Mathematics Teaching Methods',
    });

    expect(buildFullPaperHoverCard({
      citedByCount: 0,
      publicationYear: null,
      title: '',
    })).toEqual({
      meta: 'Unknown year · cited by 0',
      title: 'Untitled work',
    });
  });
});
