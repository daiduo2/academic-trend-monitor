import { describe, expect, it } from 'vitest';
import {
  buildOpenAlexGraphAssetPath,
  getOpenAlexGraphFocusLeaves,
  normalizeOpenAlexGraphBundle,
} from '../openAlexGraphBundle';

const SAMPLE_BUNDLE = {
  source: {
    dataset_slug: 'works_2025_math_primary_topic',
  },
  meta: {
    candidate_disclaimer: {
      text: 'Candidate-only graph.',
    },
    default_visible_layers: ['trunk_nodes', 'backbone_edges'],
  },
  stats: {
    trunk_node_count: 2,
    bridge_queue_edge_count: 1,
  },
  filters: {
    edge_kinds: ['BACKBONE_EDGE', 'BRIDGE_QUEUE_EDGE', 'LEAF_ATTACHMENT'],
  },
  nodes: {
    trunk: [
      {
        id: 'T1',
        label: 'Trunk One',
        taxonomy: {
          subfield: { id: '2601', label: 'Algebra' },
        },
      },
      {
        id: 'T2',
        label: 'Trunk Two',
        taxonomy: {
          subfield: { id: '2602', label: 'Geometry' },
        },
      },
    ],
    leaves: [
      {
        id: 'L1',
        label: 'Leaf One',
      },
    ],
  },
  edges: {
    backbone: [
      {
        id: 'T1__T2',
        source: 'T1',
        target: 'T2',
        kind: 'BACKBONE_EDGE',
        score: 0.8,
        labels: {
          source: 'Trunk One',
          target: 'Trunk Two',
        },
      },
    ],
    bridge_queue: [
      {
        id: 'T1__T2_bridge',
        source: 'T1',
        target: 'T2',
        kind: 'BRIDGE_QUEUE_EDGE',
        score: 0.6,
        labels: {
          source: 'Trunk One',
          target: 'Trunk Two',
        },
      },
    ],
    leaf_attachments: [
      {
        id: 'L1__T1__1',
        source: 'L1',
        target: 'T1',
        kind: 'LEAF_ATTACHMENT',
        labels: {
          source: 'Leaf One',
          target: 'Trunk One',
        },
        weight: {
          work_count: 7,
          share_within_leaf: 0.7,
        },
      },
    ],
  },
};

const SAMPLE_LEGEND = {
  candidate_only: {
    text: 'Legend candidate disclaimer.',
  },
};

describe('openAlexGraphBundle', () => {
  it('builds static asset paths under the accepted visualization root', () => {
    expect(buildOpenAlexGraphAssetPath('/academic-trend-monitor/', 'legend.json')).toBe(
      '/academic-trend-monitor/data/output/openalex_graph_v1_visualization/openalex_topic_graph_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/legend.json',
    );
  });

  it('normalizes bundle data into UI-friendly neighbor and attachment lookups', () => {
    const graph = normalizeOpenAlexGraphBundle(SAMPLE_BUNDLE, SAMPLE_LEGEND);

    expect(graph.disclaimer).toBe('Candidate-only graph.');
    expect(graph.trunkNodesById.T1.label).toBe('Trunk One');
    expect(graph.trunkNodes.find((node) => node.id === 'T1')).toMatchObject({
      backboneDegree: 1,
      bridgeDegree: 1,
      leafAttachmentCount: 1,
    });
    expect(graph.backboneNeighborsByNodeId.T1[0]).toMatchObject({
      nodeId: 'T2',
      edgeId: 'T1__T2',
    });
    expect(graph.bridgeNeighborsByNodeId.T2[0]).toMatchObject({
      nodeId: 'T1',
      edgeId: 'T1__T2_bridge',
    });
    expect(graph.leafAttachmentsByTrunkId.T1[0]).toMatchObject({
      id: 'L1__T1__1',
      leaf: {
        id: 'L1',
        label: 'Leaf One',
      },
    });
  });

  it('derives focused leaves from a selected trunk or selected edge', () => {
    const graph = normalizeOpenAlexGraphBundle(SAMPLE_BUNDLE, SAMPLE_LEGEND);

    expect(getOpenAlexGraphFocusLeaves(graph, { selectedNodeId: 'T1' })).toMatchObject({
      focusTrunkIds: ['T1'],
      leafNodes: [{ id: 'L1', label: 'Leaf One' }],
    });

    expect(getOpenAlexGraphFocusLeaves(graph, { selectedEdgeId: 'T1__T2' })).toMatchObject({
      focusTrunkIds: ['T1', 'T2'],
      leafNodes: [{ id: 'L1', label: 'Leaf One' }],
    });
  });
});
