import { Suspense, lazy, useState, useCallback, useEffect, useMemo } from 'react';
import { useKnowledgeGraph } from '../hooks/useKnowledgeGraph';
import { GraphVisualization } from '../components/GraphVisualization';
import { GraphFilters } from '../components/GraphFilters';
import { TopicDetailEmptyState } from '../components/TopicDetailEmptyState';
import {
  findPresetKeyForState,
  getDefaultKnowledgeGraphPresetKey,
  getKnowledgeGraphPresetByKey,
  getKnowledgeGraphPresets,
  normalizeSubcategoryCode,
} from '../utils/knowledgeGraphConfig';

const PRESET_TAG_TONES = {
  blue: 'bg-blue-100 text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  purple: 'bg-purple-100 text-purple-700',
  slate: 'bg-slate-100 text-slate-700',
};

const EXPORT_PRESENCE_META = {
  baseline_subgraph: {
    label: '已进入默认主图',
    className: 'bg-emerald-100 text-emerald-700',
  },
  docs_only_contract: {
    label: '仅合约层',
    className: 'bg-orange-100 text-orange-700',
  },
  docs_only_narrative: {
    label: '仅叙事层',
    className: 'bg-sky-100 text-sky-700',
  },
};

const GRAPH_BAND_LABELS = {
  baseline: 'baseline',
  bridge: 'bridge',
  boundary: 'boundary',
  review: 'review',
  contract: 'contract',
  deferred: 'deferred',
};

function isMissingLocalKnowledgeGraphData(error) {
  const message = String(error?.message || error || '');
  return message.includes('Failed to load JSON from fallback paths')
    && message.includes('kg_v1_visualization');
}

function formatDomainCode(code) {
  return code.replace('math.', '');
}

const TopicDetail = lazy(() => import('../components/TopicDetail'));
const TimelineSummary = lazy(() => import('../components/TimelineSummary'));

/**
 * KnowledgeGraph - Main graph view page
 *
 * Layout: filters on left, graph center, detail on right
 * Uses useKnowledgeGraph hook for data loading
 */

export default function KnowledgeGraph() {
  const urlParams = new URLSearchParams(window.location.search);
  const prPreviewEnabled = urlParams.get('pr_preview') === '1';
  const sourceMode = prPreviewEnabled ? 'pr_conditional' : 'baseline';
  const presets = useMemo(
    () => getKnowledgeGraphPresets({ prPreviewEnabled }),
    [prPreviewEnabled],
  );
  const defaultPresetKey = useMemo(
    () => getDefaultKnowledgeGraphPresetKey({ prPreviewEnabled }),
    [prPreviewEnabled],
  );
  const defaultPreset = useMemo(
    () => getKnowledgeGraphPresetByKey(presets, defaultPresetKey) || presets[0],
    [presets, defaultPresetKey],
  );

  const {
    topics,
    subcategories,
    edges,
    filters: availableFilters,
    stats,
    domainKnowledgeLayers,
    narrativeSubgraphs,
    loading,
    error,
  } = useKnowledgeGraph({ sourceMode });

  const [filterState, setFilterState] = useState(defaultPreset?.filter || {
    subcategory: 'all',
    edgeKinds: ['EVOLVES_TO', 'PARENT_OF'],
    confidence: ['confirmed', 'ambiguous', 'data-derived'],
  });
  const [activePresetKey, setActivePresetKey] = useState(defaultPresetKey);

  const [selectedTopicId, setSelectedTopicId] = useState(null);

  const [timelineData, setTimelineData] = useState(null);
  const [timelineRequested, setTimelineRequested] = useState(false);
  const hideTimeline = prPreviewEnabled && activePresetKey === 'research-preview';
  const narrativeOverlayEnabled = true;

  useEffect(() => {
    if (hideTimeline) {
      setTimelineRequested(false);
      setTimelineData(null);
      return undefined;
    }

    let timeoutId = null;
    let idleId = null;

    const scheduleTimelineLoad = () => setTimelineRequested(true);

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(scheduleTimelineLoad, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(scheduleTimelineLoad, 250);
    }

    return () => {
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [hideTimeline]);

  useEffect(() => {
    if (!timelineRequested || hideTimeline) {
      return undefined;
    }

    let cancelled = false;
    const basePath = import.meta.env.BASE_URL || '/';
    const vizDir = prPreviewEnabled ? 'kg_v1_pr_conditional_visualization' : 'kg_v1_visualization';

    fetch(`${basePath}data/output/${vizDir}/timeline_summary.json`)
      .then(r => r.json())
      .then((payload) => {
        if (!cancelled) {
          setTimelineData(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTimelineData(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [prPreviewEnabled, hideTimeline, timelineRequested]);

  useEffect(() => {
    if (!defaultPreset) return;
    setFilterState(defaultPreset.filter);
    setActivePresetKey(defaultPreset.key);
    setSelectedTopicId(null);
  }, [defaultPreset]);

  // Get selected topic object
  const narrativeOverlayTopics = useMemo(
    () => narrativeOverlayEnabled
      ? Object.values(narrativeSubgraphs || {}).flatMap((subgraph) => subgraph?.nodes?.topics || [])
      : [],
    [narrativeSubgraphs, narrativeOverlayEnabled],
  );

  const narrativeOverlayEdges = useMemo(
    () => narrativeOverlayEnabled
      ? Object.values(narrativeSubgraphs || {}).flatMap((subgraph) => subgraph?.edges || [])
      : [],
    [narrativeSubgraphs, narrativeOverlayEnabled],
  );

  const displayTopics = useMemo(() => {
    const merged = new Map();
    topics.forEach((topic) => merged.set(topic.id, topic));
    narrativeOverlayTopics.forEach((topic) => {
      if (!merged.has(topic.id)) {
        merged.set(topic.id, topic);
      }
    });
    return [...merged.values()];
  }, [topics, narrativeOverlayTopics]);

  const displayEdges = useMemo(() => {
    const byKind = {
      ...edges,
      EVOLVES_TO: [...(edges.EVOLVES_TO || [])],
    };
    const seen = new Set(
      byKind.EVOLVES_TO.map((edge) => `${edge.source}|${edge.target}|${edge.benchmark_case_id || ''}|${edge.graph_export_status || ''}`),
    );

    narrativeOverlayEdges.forEach((edge) => {
      const key = `${edge.source}|${edge.target}|${edge.benchmark_case_id || ''}|${edge.graph_export_status || ''}`;
      if (!seen.has(key)) {
        byKind.EVOLVES_TO.push(edge);
        seen.add(key);
      }
    });

    return byKind;
  }, [edges, narrativeOverlayEdges]);

  const displayStats = useMemo(
    () => ({
      ...stats,
      topic_count: displayTopics.length,
      evolves_to_count: (displayEdges.EVOLVES_TO || []).length,
      narrative_overlay_topic_count: narrativeOverlayTopics.length,
      narrative_overlay_edge_count: narrativeOverlayEdges.length,
    }),
    [stats, displayTopics.length, displayEdges, narrativeOverlayTopics.length, narrativeOverlayEdges.length],
  );

  const selectedTopic = selectedTopicId
    ? displayTopics.find((t) => t.id === selectedTopicId) || null
    : null;

  useEffect(() => {
    if (!selectedTopicId || !selectedTopic) return;
    const normalizedSubcategory = normalizeSubcategoryCode(filterState?.subcategory);

    if (normalizedSubcategory && normalizedSubcategory !== 'all' && selectedTopic.subcategory !== normalizedSubcategory) {
      setSelectedTopicId(null);
    }
  }, [filterState?.subcategory, selectedTopicId, selectedTopic]);

  const baselineTopics = useMemo(
    () => topics.filter((topic) => ['LO', 'AG'].includes(topic.subcategory)),
    [topics],
  );
  const baselineEvolutionEdges = useMemo(
    () => (edges.EVOLVES_TO || []).filter((edge) => ['math.LO', 'math.AG'].includes(edge.subcategory)),
    [edges],
  );
  const previewTopics = useMemo(
    () => topics.filter((topic) => topic.subcategory === 'PR'),
    [topics],
  );
  const previewEvolutionEdges = useMemo(
    () => (edges.EVOLVES_TO || []).filter((edge) => edge.subcategory === 'math.PR' || edge.confidence === 'inferred'),
    [edges],
  );
  const narrativeDomains = useMemo(
    () => Object.entries(domainKnowledgeLayers)
      .filter(([code, layer]) => code !== 'math.LO' && code !== 'math.AG' && layer?.export_presence !== 'baseline_subgraph')
      .sort(([, left], [, right]) => (right?.case_count || 0) - (left?.case_count || 0)),
    [domainKnowledgeLayers],
  );
  const narrativeDomainCount = narrativeDomains.length;
  const currentPreset = useMemo(
    () => presets.find((preset) => preset.key === activePresetKey) || null,
    [presets, activePresetKey],
  );
  const firstGlanceSummary = useMemo(() => {
    if (prPreviewEnabled) {
      return '推荐顺序：先看 Demo 导览，再切稳定基线；只有要解释 PR 候选时，才切 Research Preview。';
    }

    return '推荐顺序：先看 Demo 导览，再切稳定基线展开完整 confirmed layer。';
  }, [prPreviewEnabled]);
  const firstGlanceSteps = useMemo(() => {
    if (prPreviewEnabled) {
      return ['先讲绿色/黄色主线，再决定要不要展开紫色 preview 候选。', '右侧卡片会直接说明当前 topic 属于 baseline 还是 preview。'];
    }

    return ['先认清演化主线，再把细线和虚线当成背景结构。', '点开主题后，右侧卡片会先给讲法，再解释关系。'];
  }, [prPreviewEnabled]);
  const selectionSummary = useMemo(() => {
    if (!selectedTopic) return null;

    const connectedCount = Object.values(displayEdges || {})
      .flat()
      .filter((edge) => edge.source === selectedTopic.id || edge.target === selectedTopic.id)
      .length;

    return {
      label: selectedTopic.label || selectedTopic.id,
      connectedCount,
    };
  }, [selectedTopic, displayEdges]);

  // Handle topic click
  const handleTopicClick = useCallback((topic) => {
    setSelectedTopicId(topic?.id || null);
  }, []);

  // Handle close detail panel
  const handleCloseDetail = useCallback(() => {
    setSelectedTopicId(null);
  }, []);

  const handlePresetSelect = useCallback((presetKey) => {
    const preset = presets.find((item) => item.key === presetKey);
    if (!preset) return;
    setFilterState(preset.filter);
    setActivePresetKey(preset.key);
  }, [presets]);

  const handleFilterChange = useCallback((nextState) => {
    setFilterState(nextState);
    setActivePresetKey(findPresetKeyForState(presets, nextState));
  }, [presets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">加载知识图谱...</p>
        </div>
      </div>
    );
  }

  if (error && isMissingLocalKnowledgeGraphData(error)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h3 className="text-lg font-semibold mb-2">本地知识图谱数据未找到</h3>
        <p className="text-sm leading-6">
          旧版数学知识图谱需要本地 `kg_v1_visualization` bundle。当前前端没有可用的本地静态 bundle，
          所以页面保持为空状态而不是把 Vite 的 HTML fallback 当作 JSON 解析。
        </p>
        <p className="mt-3 text-sm leading-6">
          如需查看当前可用的图谱可视化，请切换到
          {' '}
          <a className="font-medium text-blue-700 underline underline-offset-2" href="/academic-trend-monitor/openalex-graph">
            OpenAlex图谱
          </a>
          。
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-medium text-red-800 mb-2">加载失败</h3>
        <p className="text-red-600">{error.message || error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-gray-900">数学知识图谱 Demo</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                prPreviewEnabled
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {prPreviewEnabled ? 'Preview Bundle Active' : 'Stable Baseline'}
            </span>
            {prPreviewEnabled && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                默认 baseline 未变更
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm leading-6 max-w-3xl">
            {prPreviewEnabled
              ? '当前打开的是 opt-in preview bundle，不是默认 baseline 页面。默认 /knowledge-graph 仍然只读 math.LO + math.AG；这里出现的 math.PR 只作为 conditional layer 展示研究中的候选关系。'
              : '默认展示当前稳定 baseline：math.LO（逻辑）+ math.AG（代数几何），并叠加 CO / DS 的非 baseline 叙事层，让主图更接近当前研究全貌。'}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6 text-sm sm:max-w-sm">
          <div className="text-right">
            <p className="text-xs text-gray-400">主题</p>
            <p className="font-semibold text-gray-900">{displayStats.topic_count || displayTopics.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">子类别</p>
            <p className="font-semibold text-gray-900">{stats.subcategory_count || subcategories.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">状态</p>
            <p className={`font-semibold text-sm ${prPreviewEnabled ? 'text-purple-600' : 'text-emerald-600'}`}>
              {currentPreset?.label || '自定义视角'}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="font-medium uppercase tracking-wider">Demo 入口</span>
          <span className="flex-1 h-px bg-gray-200" />
        </div>
        <div
          className={`rounded-xl border px-4 py-3 ${
            prPreviewEnabled
              ? 'border-purple-200 bg-purple-50'
              : 'border-blue-200 bg-blue-50'
          }`}
        >
          <p className={`text-sm font-medium ${prPreviewEnabled ? 'text-purple-900' : 'text-blue-900'}`}>
            {prPreviewEnabled
              ? '当前虽然加载了 preview bundle，但默认仍建议从 Demo 导览开始。'
              : '第一次打开建议直接从 Demo 导览开始。'}
          </p>
          <p className={`text-xs leading-6 mt-1 ${prPreviewEnabled ? 'text-purple-800' : 'text-blue-800'}`}>
            {prPreviewEnabled
              ? '讲 confirmed baseline 时切“稳定基线”；只有要解释 PR 候选关系时，才切“Research Preview”。'
              : '先看主线，再按需要切到“稳定基线”展开完整 confirmed layer。'}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {presets.map((preset) => {
            const isActive = preset.key === activePresetKey;
            return (
              <button
                key={preset.key}
                onClick={() => handlePresetSelect(preset.key)}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  isActive
                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-sm font-semibold ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                      {preset.label}
                    </span>
                    {preset.tag && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[11px] font-medium ${
                          PRESET_TAG_TONES[preset.tagTone] || PRESET_TAG_TONES.slate
                        }`}
                      >
                        {preset.tag}
                      </span>
                    )}
                  </div>
                  {isActive && <span className="text-[11px] font-medium text-blue-700">当前视角</span>}
                </div>
                <p className={`text-xs leading-5 mt-2 ${isActive ? 'text-blue-800' : 'text-gray-500'}`}>
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section label */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="font-medium uppercase tracking-wider">图谱浏览</span>
        <span className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Main content - 3 column layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left sidebar - Filters */}
        <div className="col-span-12 lg:col-span-2">
          <GraphFilters
            filters={availableFilters}
            value={filterState}
            onChange={handleFilterChange}
            presets={presets}
            activePresetKey={activePresetKey}
            onPresetChange={handlePresetSelect}
            defaultState={defaultPreset?.filter}
            sourceMode={sourceMode}
            currentPreset={currentPreset}
          />
        </div>

        {/* Center - Graph visualization */}
        <div className="col-span-12 lg:col-span-7">
          <div className="bg-slate-900 rounded-lg overflow-hidden shadow-sm">
            <GraphVisualization
              topics={displayTopics}
              edges={displayEdges}
              filters={filterState}
              selectedTopic={selectedTopicId}
              selectedTopicLabel={selectionSummary?.label || null}
              selectedTopicEdgeCount={selectionSummary?.connectedCount || 0}
              onTopicClick={handleTopicClick}
              sourceMode={sourceMode}
              activePresetKey={activePresetKey}
            />
          </div>
        </div>

        {/* Right sidebar - Topic detail */}
        <div className="col-span-12 lg:col-span-3">
          {selectedTopic ? (
            <Suspense fallback={<TopicDetailEmptyState sourceMode={sourceMode} loading />}>
              <TopicDetail
                topic={selectedTopic}
                topics={displayTopics}
                edges={displayEdges}
                onClose={handleCloseDetail}
                sourceMode={sourceMode}
              />
            </Suspense>
          ) : (
            <TopicDetailEmptyState sourceMode={sourceMode} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-2">当前稳定层</p>
          <p className="text-sm text-emerald-950 leading-6">
            LO + AG 仍是默认 baseline。当前可稳定演示的是 {baselineTopics.length} 个主题和 {baselineEvolutionEdges.length} 条 baseline 演化边；另外还叠加了 {narrativeOverlayTopics.length} 个 CO / DS narrative topics 和 {narrativeOverlayEdges.length} 条 non-baseline 演化边，让主图更接近今天已经整理好的研究外圈。
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">第一次打开怎么讲</p>
          <div className="space-y-2">
            <p className="text-sm text-slate-800 leading-6">{firstGlanceSummary}</p>
            {firstGlanceSteps.map((step) => (
              <p key={step} className="text-xs text-slate-600 leading-5">
                • {step}
              </p>
            ))}
          </div>
        </div>
        <div
          className={`rounded-xl border p-4 ${
            prPreviewEnabled
              ? 'border-purple-200 bg-purple-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-[0.2em] mb-2 ${
              prPreviewEnabled ? 'text-purple-700' : 'text-amber-700'
            }`}
          >
            {prPreviewEnabled ? 'Preview 增量' : '未纳入默认'}
          </p>
          <p className={`text-sm leading-6 ${prPreviewEnabled ? 'text-purple-950' : 'text-amber-900'}`}>
            {prPreviewEnabled
              ? `本次 preview 额外加载了 ${previewTopics.length} 个 PR 主题和 ${previewEvolutionEdges.length} 条条件性演化边；它们会出现在 preview bundle 中，但不会把 PR 讲成已确认 baseline。`
              : 'math.PR 仍未被默认当作结论层展示；当前额外进入主图的 CO / DS 只属于 non-baseline narrative layer，不代表 baseline truth 被扩张。'}
          </p>
        </div>
      </div>

      {/* Timeline */}
      {!hideTimeline && timelineRequested && timelineData && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">时间轴</h3>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <Suspense fallback={<div className="h-[220px] animate-pulse rounded-lg bg-slate-100" />}>
              <TimelineSummary data={timelineData} height={220} />
            </Suspense>
          </div>
        </div>
      )}

      {!hideTimeline && !timelineRequested && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-1">时间轴将在页面稳定后加载</h3>
          <p className="text-sm text-slate-600 leading-6">
            首屏先优先保证图谱和讲述卡可直接演示，时间轴会在空闲时再补进来。
          </p>
        </div>
      )}

      {hideTimeline && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <h3 className="text-sm font-medium text-purple-800 mb-1">时间轴已在 Preview 视角下隐藏</h3>
          <p className="text-sm text-purple-900 leading-6">
            当前视角只聚焦 math.PR 的 conditional layer，但现有时间轴仍汇总整个 conditional bundle。
            为避免 PR-only 图和全量 conditional 时间轴混搭，这里不显示时间轴。
            如需查看完整时间演化，请切回 “稳定基线” 或 “Demo 导览”。
          </p>
        </div>
      )}

      {/* Help text */}
      <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${prPreviewEnabled ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-4`}>
          <div>
            <p className="font-medium mb-1.5 text-gray-700">默认 baseline</p>
            <p className="text-xs leading-6">
              默认页面只读 LO + AG 的稳定 bundle。它代表当前确认层，不代表所有数学子域都已经完成。
            </p>
          </div>
          <div>
            <p className="font-medium mb-1.5 text-gray-700">图例怎么读</p>
            <ul className="space-y-1 text-xs">
              <li>• 粗线：演化主线</li>
              <li>• 细线：层级背景</li>
              <li>• 灰色虚线：结构近邻，不等于演化</li>
              <li>• 绿色：confirmed baseline；黄色：待复核；紫色：preview 候选</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1.5 text-gray-700">交互说明</p>
            <ul className="space-y-1 text-xs">
              <li>• 从 Demo 导览开始最适合第一次讲解</li>
              <li>• 拖拽节点可调整布局，滚轮可缩放</li>
              <li>• 点击节点后，图里会聚焦它的直连关系</li>
              <li>• 右侧卡片会同步解释状态和讲述重点</li>
            </ul>
          </div>
          {prPreviewEnabled && (
            <div>
              <p className="font-medium mb-1.5 text-gray-700">PR preview</p>
              <p className="text-xs leading-6">
                当前已开启 preview bundle。页面会先停留在讲述型 Demo 导览；只有切到 Research Preview，才会只聚焦 PR conditional layer。
              </p>
            </div>
          )}
        </div>
      </div>

      {narrativeDomainCount > 0 && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 mb-2">已整理但未纳入默认主图</p>
              <p className="text-sm text-sky-950 leading-6 max-w-3xl">
                这几天扩出来的数学子域已经进入当前 bundle 的 narrative metadata，但还没有升格成默认 baseline topology。
                这意味着我们现在能把它们讲出来，但不能把它们误说成默认主图里的 confirmed 主线。
              </p>
            </div>
            <div className="rounded-lg bg-white/70 px-3 py-2 text-right">
              <p className="text-xs text-sky-600">已整理子域</p>
              <p className="text-lg font-semibold text-sky-950">{narrativeDomainCount}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {narrativeDomains.map(([code, layer]) => {
              const exportPresence = EXPORT_PRESENCE_META[layer.export_presence] || {
                label: layer.export_presence || 'metadata',
                className: 'bg-slate-100 text-slate-700',
              };
              const visibleBands = (layer.visible_graph_bands || []).map((band) => GRAPH_BAND_LABELS[band] || band);
              return (
                <div key={code} className="rounded-xl border border-sky-100 bg-white/80 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{formatDomainCode(code)}</p>
                      <p className="text-xs text-slate-500 mt-1">{layer.source_doc || 'narrative metadata'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${exportPresence.className}`}>
                      {exportPresence.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-6">{layer.summary}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-slate-500">cases</p>
                      <p className="font-semibold text-slate-900">{layer.case_count || 0}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-slate-500">shape</p>
                      <p className="font-semibold text-slate-900">{layer.graph_shape || '-'}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-slate-500">rule</p>
                      <p className="font-semibold text-slate-900">{layer.selected_rule || layer.candidate_rule || '-'}</p>
                    </div>
                  </div>
                  {visibleBands.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {visibleBands.map((band) => (
                        <span key={`${code}-${band}`} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          {band}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { KnowledgeGraph };
