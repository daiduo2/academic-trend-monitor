/**
 * GraphFilters - Filter panel for Knowledge Graph
 *
 * Props:
 * - filters: Available filter options from useKnowledgeGraph
 * - value: Current filter values
 * - onChange: Callback when filters change
 */

import { BASELINE_FULL_FILTER, sameFilterState } from '../utils/knowledgeGraphConfig';

export function GraphFilters({
  filters,
  value,
  onChange,
  defaultState = BASELINE_FULL_FILTER,
}) {
  const {
    subcategory = defaultState.subcategory,
    edgeKinds = defaultState.edgeKinds,
    confidence = defaultState.confidence,
  } = value || {};

  const edgeKindOptions = filters?.edgeKinds || [
    { value: 'NEIGHBOR_OF', label: '相邻主题' },
    { value: 'PARENT_OF', label: '层级关系' },
    { value: 'EVOLVES_TO', label: '演化关系' },
  ];

  const confidenceOptions = filters?.confidenceLevels || [
    { value: 'confirmed', label: '已确认 baseline', color: '#22c55e' },
    { value: 'ambiguous', label: '待复核', color: '#f59e0b' },
    { value: 'negative', label: '已排除', color: '#ef4444' },
  ];

  const activeCount = [
    subcategory !== defaultState.subcategory ? 1 : 0,
    !sameFilterState(
      { subcategory: defaultState.subcategory, edgeKinds, confidence: defaultState.confidence },
      { subcategory: defaultState.subcategory, edgeKinds: defaultState.edgeKinds, confidence: defaultState.confidence },
    ) ? 1 : 0,
    !sameFilterState(
      { subcategory: defaultState.subcategory, edgeKinds: defaultState.edgeKinds, confidence },
      { subcategory: defaultState.subcategory, edgeKinds: defaultState.edgeKinds, confidence: defaultState.confidence },
    ) ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const handleSubcategoryChange = (e) => {
    onChange?.({ ...value, subcategory: e.target.value });
  };

  const handleEdgeKindToggle = (kind) => {
    const newEdgeKinds = edgeKinds.includes(kind)
      ? edgeKinds.filter((k) => k !== kind)
      : [...edgeKinds, kind];
    onChange?.({ ...value, edgeKinds: newEdgeKinds });
  };

  const handleConfidenceToggle = (level) => {
    const newConfidence = confidence.includes(level)
      ? confidence.filter((c) => c !== level)
      : [...confidence, level];
    onChange?.({ ...value, confidence: newConfidence });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-6">
      {/* Header with active filter badge */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">筛选条件</h3>
        {activeCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {activeCount} 个筛选
          </span>
        )}
      </div>

      {/* Subcategory filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">子类别</label>
        <select
          value={subcategory}
          onChange={handleSubcategoryChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="all">全部</option>
          {filters?.subcategories?.map((sub) => (
            <option key={sub.code} value={sub.code}>
              {sub.label}
            </option>
          ))}
        </select>
      </div>

      {/* Edge kind filter with count badge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">边类型</label>
          {edgeKinds.length !== edgeKindOptions.length && (
            <span className="text-xs text-gray-400">
              {edgeKinds.length}/{edgeKindOptions.length}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {edgeKindOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={edgeKinds.includes(option.value)}
                onChange={() => handleEdgeKindToggle(option.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Confidence filter with prominent color dots */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">置信度</label>
        <div className="space-y-2">
          {confidenceOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confidence.includes(option.value)}
                onChange={() => handleConfidenceToggle(option.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-black/10"
                style={{ backgroundColor: option.color }}
              />
              <span className="text-sm text-gray-600">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset button - visually distinct when filters are active */}
      <button
        onClick={() => onChange?.(defaultState)}
        className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
          activeCount > 0
            ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
            : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
        }`}
      >
        {activeCount > 0 ? `重置筛选 (${activeCount})` : '重置筛选'}
      </button>
    </div>
  );
}

export default GraphFilters;
