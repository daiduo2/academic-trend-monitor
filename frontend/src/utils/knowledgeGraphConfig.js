export const ALL_EDGE_KINDS = ['NEIGHBOR_OF', 'PARENT_OF', 'EVOLVES_TO'];

export const BASELINE_FULL_FILTER = {
  subcategory: 'all',
  edgeKinds: [...ALL_EDGE_KINDS],
  confidence: ['confirmed', 'ambiguous', 'negative', 'data-derived'],
};

export const KNOWLEDGE_GRAPH_SUBCATEGORY_META = {
  'math.LO': {
    label: '逻辑（math.LO）',
    shortLabel: '逻辑',
    description: '当前稳定 baseline 子域',
  },
  'math.AG': {
    label: '代数几何（math.AG）',
    shortLabel: '代数几何',
    description: '当前稳定 baseline 子域',
  },
  'math.PR': {
    label: '概率论预览层（math.PR）',
    shortLabel: '概率论',
    description: '只在 opt-in Research Preview 中出现',
  },
};

export const TOPIC_SUBCATEGORY_META = {
  LO: {
    label: '逻辑',
    code: 'math.LO',
    description: '稳定 baseline 子域',
  },
  AG: {
    label: '代数几何',
    code: 'math.AG',
    description: '稳定 baseline 子域',
  },
  PR: {
    label: '概率论',
    code: 'math.PR',
    description: 'conditional preview 子域',
  },
};

export const CONFIDENCE_CONFIG = {
  confirmed: {
    label: '已确认 baseline',
    color: '#22c55e',
  },
  ambiguous: {
    label: '待复核',
    color: '#f59e0b',
  },
  negative: {
    label: '已排除',
    color: '#ef4444',
  },
  'data-derived': {
    label: '结构背景',
    color: '#6366f1',
  },
  inferred: {
    label: '条件层推断',
    color: '#a855f7',
  },
};

function cloneFilterState(filterState) {
  return {
    subcategory: filterState.subcategory,
    edgeKinds: [...filterState.edgeKinds],
    confidence: [...filterState.confidence],
  };
}

function normalizeValues(values = []) {
  return [...new Set(values)].sort();
}

export function normalizeSubcategoryCode(code) {
  if (!code || code === 'all') return code;
  return code.includes('.') ? code.split('.').pop() : code;
}

export function sameFilterState(left, right) {
  if (!left || !right) return false;

  return (
    left.subcategory === right.subcategory
    && JSON.stringify(normalizeValues(left.edgeKinds)) === JSON.stringify(normalizeValues(right.edgeKinds))
    && JSON.stringify(normalizeValues(left.confidence)) === JSON.stringify(normalizeValues(right.confidence))
  );
}

export function getKnowledgeGraphPresets({ prPreviewEnabled = false } = {}) {
  const demoFilter = {
    subcategory: 'all',
    edgeKinds: ['EVOLVES_TO', 'PARENT_OF'],
    confidence: prPreviewEnabled
      ? ['confirmed', 'ambiguous', 'data-derived', 'inferred']
      : ['confirmed', 'ambiguous', 'data-derived'],
  };

  const presets = [
    {
      key: 'demo',
      label: 'Demo 导览',
      tag: '推荐起点',
      tagTone: 'blue',
      description: prPreviewEnabled
        ? '推荐先从这里开讲：先建立 baseline 心智，再决定是否展开 preview 候选。'
        : '第一次讲解建议从这里开始，只保留主线与必要层级背景。',
      focusTitle: prPreviewEnabled
        ? '这是 preview bundle 下最适合第一次讲解的入口，但紫色关系仍然只表示 preview。'
        : '先看已确认主线，再用必要的层级背景补足位置感。',
      filter: demoFilter,
    },
    {
      key: 'stable-baseline',
      label: '稳定基线',
      tag: '默认入口',
      tagTone: 'emerald',
      description: prPreviewEnabled
        ? '回到默认 /knowledge-graph 的正式口径：只看 LO + AG confirmed baseline。'
        : '完整查看当前稳定的 LO + AG baseline；这不是数学全域完成态。',
      focusTitle: '这是默认 /knowledge-graph 的正式展示层，不含 PR preview。',
      filter: BASELINE_FULL_FILTER,
    },
  ];

  if (prPreviewEnabled) {
    presets.push({
      key: 'research-preview',
      label: 'Research Preview',
      tag: 'Preview only',
      tagTone: 'purple',
      description: '只看 math.PR conditional layer。紫色关系是研究候选，不是 confirmed baseline。',
      focusTitle: '这里只能把 PR 关系当作候选线索，不能把它讲成默认结论。',
      filter: {
        subcategory: 'math.PR',
        edgeKinds: [...ALL_EDGE_KINDS],
        confidence: ['inferred', 'data-derived'],
      },
    });
  }

  return presets.map((preset) => ({
    ...preset,
    filter: cloneFilterState(preset.filter),
  }));
}

export function getDefaultKnowledgeGraphPresetKey({ prPreviewEnabled = false } = {}) {
  return 'demo';
}

export function getKnowledgeGraphPresetByKey(presets, key) {
  return presets.find((preset) => preset.key === key) || null;
}

export function findPresetKeyForState(presets, state) {
  const matchedPreset = presets.find((preset) => sameFilterState(preset.filter, state));
  return matchedPreset?.key || null;
}
