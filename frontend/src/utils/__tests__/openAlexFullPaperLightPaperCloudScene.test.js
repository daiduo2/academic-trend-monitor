import { describe, expect, it } from 'vitest';
import {
  buildLightPaperCloudFocusOverlay,
  buildLightPaperCloudGeometryBuffers,
  buildLightPaperCloudTopicRegions,
  buildProjectedLightPaperCloudPoints,
  deriveLightPaperCloudCameraState,
  pickProjectedLightPaperCloudPoint,
  resolveLightPaperCloudTopicColor,
  rotateLightPaperCloudCamera,
  resolvePickedLightPaperCloudTopic,
  zoomLightPaperCloudCamera,
} from '../openAlexFullPaperLightPaperCloudScene';

function roundList(values) {
  return values.map((value) => Number(value.toFixed(6)));
}

const SAMPLE_BUNDLE = {
  sampledPoints: [
    {
      coordinates3d: { x: -0.6, y: -0.4, z: -0.25 },
      paperIndex: 0,
      subfieldId: '2613',
      topicId: 'T1',
      workId: 'W1',
    },
    {
      coordinates3d: { x: 0.4, y: 0.4, z: 0.25 },
      paperIndex: 4,
      subfieldId: '2606',
      topicId: 'T2',
      workId: 'W5',
    },
    {
      coordinates3d: { x: 0.8, y: 0.5, z: 0.35 },
      paperIndex: 5,
      subfieldId: '2606',
      topicId: 'T2',
      workId: 'W6',
    },
  ],
  sampledPointsByPaperIndex: {
    0: {
      coordinates3d: { x: -0.6, y: -0.4, z: -0.25 },
      paperIndex: 0,
      subfieldId: '2613',
      topicId: 'T1',
      workId: 'W1',
    },
    4: {
      coordinates3d: { x: 0.4, y: 0.4, z: 0.25 },
      paperIndex: 4,
      subfieldId: '2606',
      topicId: 'T2',
      workId: 'W5',
    },
    5: {
      coordinates3d: { x: 0.8, y: 0.5, z: 0.35 },
      paperIndex: 5,
      subfieldId: '2606',
      topicId: 'T2',
      workId: 'W6',
    },
  },
  topicById: {
    T1: {
      paperIndices: [0, 1, 2, 3],
      sampledPointIndices: [0],
      subfieldDisplayName: 'Statistics and Probability',
      subfieldId: '2613',
      topicDisplayName: 'Statistical Inference',
      topicId: 'T1',
    },
    T2: {
      paperIndices: [4, 5, 6, 7],
      sampledPointIndices: [1, 2],
      subfieldDisplayName: 'Geometry and Topology',
      subfieldId: '2606',
      topicDisplayName: 'Geometric Analysis',
      topicId: 'T2',
    },
  },
  topicIds: ['T1', 'T2'],
};

const WIDE_SAMPLE_BUNDLE = {
  sampledPoints: [
    {
      coordinates3d: { x: -3.2, y: -2.1, z: -1.4 },
      paperIndex: 0,
      subfieldId: '2613',
      topicId: 'T1',
      workId: 'W1',
    },
    {
      coordinates3d: { x: 3.1, y: -1.8, z: -1.1 },
      paperIndex: 1,
      subfieldId: '2613',
      topicId: 'T1',
      workId: 'W2',
    },
    {
      coordinates3d: { x: -2.9, y: 2.4, z: 1.2 },
      paperIndex: 2,
      subfieldId: '2606',
      topicId: 'T2',
      workId: 'W3',
    },
    {
      coordinates3d: { x: 3.4, y: 2.2, z: 1.5 },
      paperIndex: 3,
      subfieldId: '2606',
      topicId: 'T2',
      workId: 'W4',
    },
  ],
  topicById: {
    T1: {
      paperIndices: [0, 1],
      sampledPointIndices: [0, 1],
      subfieldDisplayName: 'Statistics and Probability',
      subfieldId: '2613',
      topicDisplayName: 'Statistical Inference',
      topicId: 'T1',
    },
    T2: {
      paperIndices: [2, 3],
      sampledPointIndices: [2, 3],
      subfieldDisplayName: 'Geometry and Topology',
      subfieldId: '2606',
      topicDisplayName: 'Geometric Analysis',
      topicId: 'T2',
    },
  },
  topicIds: ['T1', 'T2'],
};

describe('openAlexFullPaperLightPaperCloudScene', () => {
  it('builds typed point buffers for the sampled cloud', () => {
    const geometry = buildLightPaperCloudGeometryBuffers(SAMPLE_BUNDLE);

    expect(geometry.pointPositions).toBeInstanceOf(Float32Array);
    expect(roundList(Array.from(geometry.pointPositions))).toEqual([
      -0.6, -0.4, -0.25,
      0.4, 0.4, 0.25,
      0.8, 0.5, 0.35,
    ]);
    expect(geometry.pointTopicIds).toEqual(['T1', 'T2', 'T2']);
  });

  it('builds a topic-local focus overlay from sampled point membership', () => {
    const overlay = buildLightPaperCloudFocusOverlay(SAMPLE_BUNDLE, 'T2');

    expect(overlay.sampledPointIndices).toEqual([1, 2]);
    expect(roundList(Array.from(overlay.positions))).toEqual([0.4, 0.4, 0.25, 0.8, 0.5, 0.35]);
    expect(overlay.topic).toMatchObject({
      topicId: 'T2',
      topicDisplayName: 'Geometric Analysis',
    });
  });

  it('derives a stable camera fit from sampled point coordinates', () => {
    const cameraState = deriveLightPaperCloudCameraState(SAMPLE_BUNDLE);

    expect(roundList(Object.values(cameraState.target))).toEqual([0.1, 0.05, 0.05]);
    expect(cameraState.radius).toBeGreaterThan(1);
    expect(cameraState.maxRadius).toBeGreaterThan(cameraState.radius);
  });

  it('rotates the orbit camera in response to drag deltas while clamping elevation', () => {
    const cameraState = deriveLightPaperCloudCameraState(SAMPLE_BUNDLE);
    const rotatedCamera = rotateLightPaperCloudCamera(cameraState, {
      deltaX: 48,
      deltaY: -36,
    });

    expect(rotatedCamera.azimuth).not.toBe(cameraState.azimuth);
    expect(rotatedCamera.elevation).not.toBe(cameraState.elevation);
    expect(rotatedCamera.elevation).toBeLessThanOrEqual(1.1);
    expect(rotatedCamera.elevation).toBeGreaterThanOrEqual(-1.1);
    expect(rotatedCamera.radius).toBe(cameraState.radius);
  });

  it('zooms the orbit camera with wheel deltas while respecting min and max radius bounds', () => {
    const cameraState = deriveLightPaperCloudCameraState(SAMPLE_BUNDLE);
    const zoomedInCamera = zoomLightPaperCloudCamera(cameraState, -240);
    const zoomedOutCamera = zoomLightPaperCloudCamera(cameraState, 2400);

    expect(zoomedInCamera.radius).toBeLessThan(cameraState.radius);
    expect(zoomedInCamera.radius).toBeGreaterThanOrEqual(cameraState.minRadius);
    expect(zoomedOutCamera.radius).toBeLessThanOrEqual(cameraState.maxRadius);
    expect(zoomedOutCamera.radius).toBeGreaterThanOrEqual(cameraState.minRadius);
  });

  it('keeps a representative sampled cloud inside the bounded canvas on initial load', () => {
    const cameraState = deriveLightPaperCloudCameraState(WIDE_SAMPLE_BUNDLE);
    const projectedPoints = buildProjectedLightPaperCloudPoints(
      WIDE_SAMPLE_BUNDLE,
      cameraState,
      { width: 960, height: 420 },
    );

    expect(projectedPoints).toHaveLength(4);
    expect(projectedPoints.every((point) => (
      point.screenX >= point.radius
      && point.screenX <= 960 - point.radius
      && point.screenY >= point.radius
      && point.screenY <= 420 - point.radius
    ))).toBe(true);
  });

  it('projects sampled points into visible canvas coordinates and marks focused overlays', () => {
    const cameraState = deriveLightPaperCloudCameraState(SAMPLE_BUNDLE);
    const projectedPoints = buildProjectedLightPaperCloudPoints(
      SAMPLE_BUNDLE,
      cameraState,
      { width: 960, height: 720 },
      { focusedTopicId: 'T2' },
    );

    expect(projectedPoints).toHaveLength(3);
    expect(projectedPoints.every((point) => Number.isFinite(point.screenX) && Number.isFinite(point.screenY))).toBe(true);
    expect(projectedPoints.filter((point) => point.isFocused).map((point) => point.topicId)).toEqual(['T2', 'T2']);
  });

  it('uses a larger default point radius and supports multiple focused topics', () => {
    const cameraState = deriveLightPaperCloudCameraState(SAMPLE_BUNDLE);
    const projectedPoints = buildProjectedLightPaperCloudPoints(
      SAMPLE_BUNDLE,
      cameraState,
      { width: 960, height: 720 },
      { focusedTopicIds: ['T1', 'T2'] },
    );

    expect(projectedPoints).toHaveLength(3);
    expect(Math.min(...projectedPoints.map((point) => point.radius))).toBeGreaterThanOrEqual(2.4);
    expect(projectedPoints.every((point) => point.isFocused)).toBe(true);
  });

  it('derives atlas-style topic regions from projected sampled points', () => {
    const projectedPoints = [
      { screenX: 100, screenY: 110, radius: 2, topicId: 'T1' },
      { screenX: 140, screenY: 130, radius: 2, topicId: 'T1' },
      { screenX: 500, screenY: 320, radius: 2, topicId: 'T2' },
      { screenX: 540, screenY: 360, radius: 2, topicId: 'T2' },
      { screenX: 530, screenY: 340, radius: 2, topicId: 'T2' },
    ];

    const regions = buildLightPaperCloudTopicRegions(projectedPoints, SAMPLE_BUNDLE, {
      maxLabels: 4,
      minLabelDistance: 80,
    });

    expect(regions.map((region) => region.topicId)).toEqual(['T2', 'T1']);
    expect(regions[0]).toMatchObject({
      pointCount: 3,
      topicDisplayName: 'Geometric Analysis',
      topicId: 'T2',
    });
    expect(roundList([regions[0].centerX, regions[0].centerY])).toEqual([523.333333, 340]);
    expect(regions[0].spreadRadius).toBeGreaterThan(regions[1].spreadRadius);
    expect(regions.every((region) => typeof region.color === 'string' && region.color.length > 0)).toBe(true);
  });

  it('suppresses overlapping topic labels while keeping all topic regions', () => {
    const projectedPoints = [
      { screenX: 100, screenY: 100, radius: 2, topicId: 'T1' },
      { screenX: 106, screenY: 104, radius: 2, topicId: 'T1' },
      { screenX: 122, screenY: 112, radius: 2, topicId: 'T2' },
      { screenX: 128, screenY: 116, radius: 2, topicId: 'T2' },
    ];

    const regions = buildLightPaperCloudTopicRegions(projectedPoints, SAMPLE_BUNDLE, {
      maxLabels: 4,
      minLabelDistance: 70,
    });

    expect(regions).toHaveLength(2);
    expect(regions.filter((region) => region.showLabel)).toHaveLength(1);
    expect(regions.filter((region) => !region.showLabel)).toHaveLength(1);
  });

  it('assigns distinct topic-level colors even inside the same subfield', () => {
    const firstColor = resolveLightPaperCloudTopicColor({
      subfieldId: '2606',
      topicDisplayName: 'Algebraic Geometry',
      topicId: 'T1',
    });
    const secondColor = resolveLightPaperCloudTopicColor({
      subfieldId: '2606',
      topicDisplayName: 'Graph Theory',
      topicId: 'T2',
    });
    const sameTopicColor = resolveLightPaperCloudTopicColor({
      subfieldId: '2606',
      topicDisplayName: 'Algebraic Geometry',
      topicId: 'T1',
    });

    expect(firstColor).not.toBe(secondColor);
    expect(firstColor).toBe(sameTopicColor);
    expect(firstColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(secondColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('uses normalized rank colors when the bundle provides them', () => {
    expect(resolveLightPaperCloudTopicColor({
      colorHex: 'hsl(214 86% 62%)',
      subfieldId: '2606',
      topicDisplayName: 'Algebraic Geometry',
      topicId: 'T1',
    })).toBe('hsl(214 86% 62%)');
  });

  it('picks the nearest visible sampled point from projected cloud coordinates', () => {
    const cameraState = deriveLightPaperCloudCameraState(SAMPLE_BUNDLE);
    const projectedPoints = buildProjectedLightPaperCloudPoints(
      SAMPLE_BUNDLE,
      cameraState,
      { width: 960, height: 720 },
    );
    const targetPoint = projectedPoints.find((point) => point.topicId === 'T2');

    const pickedPoint = pickProjectedLightPaperCloudPoint(
      projectedPoints,
      targetPoint.screenX,
      targetPoint.screenY,
      { width: 960, height: 720 },
    );

    expect(pickedPoint).toMatchObject({
      topicId: 'T2',
      workId: targetPoint.workId,
    });
  });

  it('resolves picked topics from point userData or point-index fallbacks', () => {
    expect(resolvePickedLightPaperCloudTopic(SAMPLE_BUNDLE, {
      index: 1,
      object: {
        userData: {},
      },
    })).toMatchObject({
      topicId: 'T2',
      topicDisplayName: 'Geometric Analysis',
    });

    expect(resolvePickedLightPaperCloudTopic(SAMPLE_BUNDLE, {
      object: {
        userData: {
          topicId: 'T1',
        },
      },
    })).toMatchObject({
      topicId: 'T1',
    });
  });

  it('fails closed for malformed point geometry and unknown topics', () => {
    const geometry = buildLightPaperCloudGeometryBuffers({
      ...SAMPLE_BUNDLE,
      sampledPoints: [
        {
          coordinates3d: { x: Number.NaN, y: 0, z: 0 },
          paperIndex: 0,
          topicId: 'T1',
        },
      ],
    });

    expect(Array.from(geometry.pointPositions)).toEqual([]);
    expect(buildLightPaperCloudFocusOverlay(SAMPLE_BUNDLE, 'missing').sampledPointIndices).toEqual([]);
    expect(resolvePickedLightPaperCloudTopic(SAMPLE_BUNDLE, {
      index: 99,
      object: { userData: {} },
    })).toBeNull();
  });
});
