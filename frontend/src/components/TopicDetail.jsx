/**
 * TopicDetail - Detail panel for selected topic
 *
 * Props:
 * - topic: Selected topic object
 * - edges: Connected edges (from useKnowledgeGraph)
 * - onClose: Callback to close the panel
 */

import { CONFIDENCE_CONFIG, TOPIC_SUBCATEGORY_META } from '../utils/knowledgeGraphConfig';

const EDGE_KIND_LABELS = {
  EVOLVES_TO: { label: '演化', color: '#f59e0b', bg: '#fef3c7' },
  PARENT_OF: { label: '层级', color: '#6366f1', bg: '#eef2ff' },
  NEIGHBOR_OF: { label: '相邻', color: '#64748b', bg: '#f1f5f9' },
  CONTAINS_TOPIC: { label: '包含', color: '#0891b2', bg: '#ecfeff' },
  ACTIVE_IN: { label: '活跃', color: '#059669', bg: '#d1fae5' },
};

const TOPIC_MODE_LABELS = {
  theory: '理论型',
  method: '方法型',
  problem: '问题型',
};

const EVIDENCE_TYPE_LABELS = {
  'benchmark-confirmed': {
    label: 'Stable Baseline',
    className: 'bg-green-50 text-green-700 border border-green-200',
  },
  provisional: {
    label: 'Research Preview',
    className: 'bg-purple-50 text-purple-700 border border-purple-200',
  },
  'data-derived': {
    label: '结构背景',
    className: 'bg-slate-100 text-slate-700 border border-slate-200',
  },
};

const STATUS_BADGES = {
  confirmed: {
    label: 'Confirmed',
    className: 'bg-green-50 text-green-700 border border-green-200',
    helper: '它已经进入当前稳定 baseline，可以作为正式结论来讲。',
  },
  inferred: {
    label: 'Inferred',
    className: 'bg-violet-50 text-violet-700 border border-violet-200',
    helper: '这条关系来自 preview 候选层，只能当作研究线索。',
  },
  conditional: {
    label: 'Conditional',
    className: 'bg-purple-50 text-purple-700 border border-purple-200',
    helper: '它只在 preview bundle 里出现，不属于默认 /knowledge-graph 的 baseline。',
  },
  'review-required': {
    label: 'Review Required',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
    helper: '这条关系仍需人工判读或补证，暂时不能升格为 confirmed baseline。',
  },
  excluded: {
    label: 'Ruled Out',
    className: 'bg-rose-50 text-rose-700 border border-rose-200',
    helper: '相关候选关系已被排除，适合用来解释主线边界。',
  },
};

const EDGE_PRIORITY = { EVOLVES_TO: 0, PARENT_OF: 1, NEIGHBOR_OF: 2, CONTAINS_TOPIC: 3, ACTIVE_IN: 4 };
const CONFIDENCE_PRIORITY = { confirmed: 0, inferred: 1, ambiguous: 2, negative: 3, 'data-derived': 4 };

const SUB_COLORS = { LO: '#3b82f6', AG: '#10b981', PR: '#a855f7', default: '#64748b' };

function sortEdges(edges) {
  return [...edges].sort((a, b) => {
    const kindDiff = (EDGE_PRIORITY[a.kind] ?? 9) - (EDGE_PRIORITY[b.kind] ?? 9);
    if (kindDiff !== 0) return kindDiff;
    return (CONFIDENCE_PRIORITY[a.confidence] ?? 9) - (CONFIDENCE_PRIORITY[b.confidence] ?? 9);
  });
}

function getTopicSummary(topic) {
  const subMeta = TOPIC_SUBCATEGORY_META[topic.subcategory] || {
    label: topic.subcategory,
    code: topic.subcategory,
  };
  const keywords = topic.keywords?.slice(0, 4).join(' / ');
  const summaryParts = [`它属于 ${subMeta.label}`];

  if (topic.topic_mode) {
    summaryParts.push(`更偏 ${TOPIC_MODE_LABELS[topic.topic_mode] || topic.topic_mode}`);
  }

  if (topic.active_periods >= 3) {
    summaryParts.push('跨多个时间片持续出现');
  } else if (topic.active_periods === 2) {
    summaryParts.push('至少跨两个时间片重复出现');
  } else {
    summaryParts.push('当前主要在单个时间片出现');
  }

  if (topic.total_papers) {
    summaryParts.push(`累计 ${topic.total_papers} 篇论文`);
  }

  if (topic.hierarchy_depth) {
    summaryParts.push(`位于图谱第 ${topic.hierarchy_depth} 层附近`);
  }

  return `${summaryParts.join('，')}${keywords ? `，关键词集中在 ${keywords}。` : '。'}`;
}

function getStoryLead(topic, metrics) {
  if (metrics.confirmed > 0 && metrics.outgoingEvolves > 0 && metrics.incomingEvolves > 0) {
    return `${topic.label} 可以被讲成 confirmed baseline 主线中的中继节点，既承接前序主题，也把叙事推向后续主题。`;
  }

  if (metrics.confirmed > 0 && metrics.outgoingEvolves > 0) {
    return `${topic.label} 适合被讲成 confirmed baseline 中向外展开的一步，用来说明主线接下来走向哪里。`;
  }

  if (metrics.confirmed > 0 && metrics.incomingEvolves > 0) {
    return `${topic.label} 适合被讲成一条 confirmed baseline 的落点，说明前面的主线如何收束到这里。`;
  }

  if (metrics.inferred > 0) {
    return `${topic.label} 更适合拿来说明 preview 中正在观察的候选延伸，而不是默认结论。`;
  }

  if (metrics.ambiguous > 0) {
    return `${topic.label} 适合拿来解释“这条线为什么还没有升格成 baseline”。`;
  }

  if (metrics.negative > 0) {
    return `${topic.label} 适合说明“结构接近不等于演化成立”这条边界。`;
  }

  if (metrics.backgroundEdges > 0) {
    return `${topic.label} 当前更像结构背景节点，用来帮助观众定位主线。`;
  }

  return `${topic.label} 当前还没有进入可讲的主关系链，这张卡片更适合做主题画像介绍。`;
}

function getStatusOverview(metrics, sourceMode) {
  if (metrics.confirmed > 0 && metrics.inferred > 0) {
    return '它同时连接 confirmed baseline 和 preview 候选层，讲解时要先说清绿色是正式结论，紫色只是研究候选。';
  }

  if (metrics.confirmed > 0) {
    return '它已经进入 confirmed baseline，可以作为稳定演化结论来讲。';
  }

  if (metrics.inferred > 0) {
    return sourceMode === 'pr_conditional'
      ? '它目前主要出现在 preview bundle 中，只能当作研究线索，不应被讲成默认 baseline。'
      : '它带有 preview 候选关系；如果你当前没开 preview，就不会在默认 baseline 中看到这类关系。';
  }

  if (metrics.ambiguous > 0) {
    return '它带有待复核的候选关系，适合说明这条线为什么还没有完全收敛。';
  }

  if (metrics.negative > 0) {
    return '与它相关的某些演化关系已经被排除，适合用来解释主线边界和反例。';
  }

  if (metrics.backgroundEdges > 0) {
    return '它当前主要承担结构背景角色，帮助说明为什么某些主题彼此相邻或处在同一层级。';
  }

  return '它当前没有直接关系可讲，因此更适合作为主题画像或补充说明。';
}

function getWhyWorthWatching(topic, metrics) {
  const reasons = [];

  if (metrics.confirmed > 0) {
    reasons.push('能直接承载 confirmed baseline 的讲述');
  }
  if (metrics.inferred > 0) {
    reasons.push('能清楚区分候选层和正式结论层');
  }
  if (metrics.ambiguous > 0) {
    reasons.push('能解释为什么有些关系仍需复核');
  }
  if (metrics.negative > 0) {
    reasons.push('能展示哪些看似相近的关系被明确排除');
  }
  if (topic.active_periods >= 3) {
    reasons.push('跨多个时间片持续出现');
  } else if (topic.active_periods === 2) {
    reasons.push('至少跨两个时间片重复出现');
  }
  if ((topic.total_papers || 0) >= 120) {
    reasons.push('论文量足够高，适合作为演示样本');
  }
  if (metrics.outgoingEvolves + metrics.incomingEvolves >= 2) {
    reasons.push('它同时连接多条主线关系，容易串起叙事');
  }
  if (reasons.length === 0 && metrics.backgroundEdges > 0) {
    reasons.push('它能帮助观众理解主线周围的结构背景');
  }

  if (reasons.length === 0) {
    return '它能作为主题画像示例，帮助观众理解这张图里单个 topic 是如何被阅读的。';
  }

  return `${reasons.slice(0, 3).join('；')}。`;
}

function getRelationshipOverview(metrics) {
  if (metrics.outgoingEvolves > 0 && metrics.incomingEvolves > 0) {
    return `它既承接 ${metrics.incomingEvolves} 条主线关系，也向外延展 ${metrics.outgoingEvolves} 条主线关系，是很适合串起来讲的中继节点。`;
  }

  if (metrics.outgoingEvolves > 0) {
    return `它向外延展 ${metrics.outgoingEvolves} 条主线关系，适合讲“从这里走向哪里”。`;
  }

  if (metrics.incomingEvolves > 0) {
    return `它承接 ${metrics.incomingEvolves} 条主线关系，适合讲“这条线最后落到了哪里”。`;
  }

  if (metrics.backgroundEdges > 0) {
    return `它没有直接演化主线，但有 ${metrics.backgroundEdges} 条背景关系，可以帮助解释它为什么出现在图里。`;
  }

  return '它当前还没有可展开的图谱关系。';
}

function getTopicStatuses(allEdges) {
  const evolvesEdges = allEdges.filter((edge) => edge.kind === 'EVOLVES_TO');
  const statuses = [];

  if (evolvesEdges.some((edge) => edge.confidence === 'confirmed')) {
    statuses.push('confirmed');
  }
  if (evolvesEdges.some((edge) => edge.confidence === 'inferred')) {
    statuses.push('inferred');
  }
  if (evolvesEdges.some((edge) => edge.evidence_type === 'provisional')) {
    statuses.push('conditional');
  }
  if (evolvesEdges.some((edge) => edge.confidence === 'ambiguous' || edge.benchmark_status === 'ambiguous')) {
    statuses.push('review-required');
  }
  if (evolvesEdges.some((edge) => edge.confidence === 'negative')) {
    statuses.push('excluded');
  }

  return statuses;
}

function getPrimaryStatus(storyStatuses) {
  if (storyStatuses.includes('confirmed')) return 'confirmed';
  if (storyStatuses.includes('conditional')) return 'conditional';
  if (storyStatuses.includes('inferred')) return 'inferred';
  if (storyStatuses.includes('review-required')) return 'review-required';
  if (storyStatuses.includes('excluded')) return 'excluded';
  return null;
}

function getEdgeNarrative(edge, direction, relatedTopic) {
  const relatedLabel = relatedTopic?.label || (direction === 'out' ? edge.target : edge.source);

  if (edge.kind === 'EVOLVES_TO' && edge.confidence === 'confirmed') {
    return direction === 'out'
      ? `这是一条已确认的 baseline 主线，可把它讲成从当前主题稳定延展到 ${relatedLabel}。`
      : `这是一条已确认的 baseline 主线，可把它讲成从 ${relatedLabel} 稳定延展到当前主题。`;
  }

  if (edge.kind === 'EVOLVES_TO' && edge.confidence === 'inferred') {
    return direction === 'out'
      ? `这是一条 preview-only 的候选关系，可把它讲成从当前主题探索性地走向 ${relatedLabel}。`
      : `这是一条 preview-only 的候选关系，可把它讲成从 ${relatedLabel} 探索性地延展到当前主题。`;
  }

  if (edge.kind === 'EVOLVES_TO' && edge.confidence === 'ambiguous') {
    return '这条关系仍在待复核区间，目前只能作为候选线索，而不是稳定结论。';
  }

  if (edge.kind === 'EVOLVES_TO' && edge.confidence === 'negative') {
    return '这条关系已经被排除，适合用来说明“相邻或相关”并不自动等于演化成立。';
  }

  if (edge.kind === 'PARENT_OF') {
    return '这是一条层级背景关系，用来帮助说明当前主题在图谱中的位置，不等于演化结论。';
  }

  if (edge.kind === 'NEIGHBOR_OF') {
    return '这是一条结构近邻关系，用来解释主题为什么彼此接近；它不直接表示演化。';
  }

  return '这条关系目前主要用于提供图结构背景。';
}

function EdgeItem({ edge, direction, topicLookup }) {
  const kindConfig = EDGE_KIND_LABELS[edge.kind] || { label: edge.kind, color: '#64748b', bg: '#f1f5f9' };
  const confConfig = CONFIDENCE_CONFIG[edge.confidence] || { label: edge.confidence, color: '#94a3b8' };
  const nodeId = direction === 'out' ? edge.target : edge.source;
  const relatedTopic = topicLookup.get(nodeId);
  const relatedMeta = relatedTopic ? TOPIC_SUBCATEGORY_META[relatedTopic.subcategory] : null;
  const directionLabel = direction === 'out' ? '当前主题 → 相关主题' : '相关主题 → 当前主题';
  const evidenceBadge = EVIDENCE_TYPE_LABELS[edge.evidence_type];

  return (
    <div className="text-xs bg-gray-50 p-3 rounded border-l-2 space-y-2" style={{ borderLeftColor: kindConfig.color }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate" title={relatedTopic?.label || nodeId}>
            {relatedTopic?.label || nodeId}
          </p>
          <p className="text-[11px] text-gray-500 truncate" title={nodeId}>
            {directionLabel}
            {relatedMeta ? ` · ${relatedMeta.label}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
          <span
            className="px-1.5 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: kindConfig.bg, color: kindConfig.color }}
          >
            {kindConfig.label}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-white border border-gray-200" style={{ color: confConfig.color }}>
            {confConfig.label}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-gray-600 leading-5">
        {getEdgeNarrative(edge, direction, relatedTopic)}
      </p>
      <div className="flex flex-wrap gap-1">
        {evidenceBadge && (
          <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${evidenceBadge.className}`}>
            {evidenceBadge.label}
          </span>
        )}
        {edge.benchmark_case_id && (
          <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-white text-gray-600 border border-gray-200">
            {edge.benchmark_case_id}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ sourceMode }) {
  const steps = sourceMode === 'pr_conditional'
    ? [
        '先从 Demo 导览或稳定基线开始，再决定要不要切到 Research Preview。',
        '优先点一条绿色或黄色演化主线两端的主题，再看紫色候选。',
        '如果右侧出现紫色状态，只能把它讲成 preview 候选，不是 confirmed baseline。',
      ]
    : [
        '先从 Demo 导览开始，优先点一条粗的演化主线两端的主题。',
        '先认清绿色是 confirmed baseline，黄色是待复核，细线和虚线只是背景结构。',
        '点开主题后，右侧会先告诉你它为什么值得讲，再解释具体关系。',
      ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full min-h-[400px]">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-1">选择一个主题开始讲解</p>
          <p className="text-xs text-gray-500 leading-6">
            {sourceMode === 'pr_conditional'
              ? '当前是 preview bundle。默认 baseline 没变，但你会在图中看到额外的 preview 候选。'
              : '当前是默认 baseline 入口。先点一个主题，右侧卡片会按讲述口径解释它。'}
          </p>
        </div>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-900">Step {index + 1}</p>
              <p className="text-xs text-slate-600 leading-5 mt-1">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TopicDetail({ topic, topics = [], edges, onClose, sourceMode = 'baseline' }) {
  if (!topic) {
    return <EmptyState sourceMode={sourceMode} />;
  }

  const topicLookup = new Map(topics.map((item) => [item.id, item]));
  const connectedEdges = { incoming: [], outgoing: [] };

  if (edges) {
    Object.values(edges).flat().forEach((edge) => {
      if (edge.target === topic.id) connectedEdges.incoming.push(edge);
      if (edge.source === topic.id) connectedEdges.outgoing.push(edge);
    });
  }

  const allEdges = [...connectedEdges.outgoing, ...connectedEdges.incoming];
  const outgoingMainEdges = sortEdges(connectedEdges.outgoing.filter((edge) => edge.kind === 'EVOLVES_TO'));
  const incomingMainEdges = sortEdges(connectedEdges.incoming.filter((edge) => edge.kind === 'EVOLVES_TO'));
  const backgroundEdges = [
    ...sortEdges(connectedEdges.outgoing.filter((edge) => edge.kind !== 'EVOLVES_TO')).map((edge) => ({ edge, direction: 'out' })),
    ...sortEdges(connectedEdges.incoming.filter((edge) => edge.kind !== 'EVOLVES_TO')).map((edge) => ({ edge, direction: 'in' })),
  ];

  const metrics = {
    confirmed: allEdges.filter((edge) => edge.kind === 'EVOLVES_TO' && edge.confidence === 'confirmed').length,
    ambiguous: allEdges.filter((edge) => edge.kind === 'EVOLVES_TO' && edge.confidence === 'ambiguous').length,
    inferred: allEdges.filter((edge) => edge.kind === 'EVOLVES_TO' && edge.confidence === 'inferred').length,
    negative: allEdges.filter((edge) => edge.kind === 'EVOLVES_TO' && edge.confidence === 'negative').length,
    evolvesTo: allEdges.filter((edge) => edge.kind === 'EVOLVES_TO').length,
    outgoingEvolves: outgoingMainEdges.length,
    incomingEvolves: incomingMainEdges.length,
    backgroundEdges: backgroundEdges.length,
  };

  const storyStatuses = getTopicStatuses(allEdges);
  const primaryStatus = getPrimaryStatus(storyStatuses);
  const subColor = SUB_COLORS[topic.subcategory] || SUB_COLORS.default;
  const subMeta = TOPIC_SUBCATEGORY_META[topic.subcategory] || {
    label: topic.subcategory,
    code: topic.subcategory,
    description: '主题子域',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">主题详情</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="text-lg font-medium text-gray-900">{topic.label}</h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              图中已聚焦
            </span>
            {primaryStatus && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGES[primaryStatus].className}`}>
                {STATUS_BADGES[primaryStatus].label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{topic.id}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subColor }} />
            {subMeta.label}
          </span>
          {topic.topic_mode && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {TOPIC_MODE_LABELS[topic.topic_mode] || topic.topic_mode}
            </span>
          )}
          {topic.active_periods >= 3 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              persistent
            </span>
          )}
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">30 秒讲法</p>
          <p className="text-sm font-medium text-blue-950 leading-6">{getStoryLead(topic, metrics)}</p>
          <p className="text-xs text-blue-800 leading-5 mt-2">{getStatusOverview(metrics, sourceMode)}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">活跃期数</p>
            <p className="text-lg font-semibold text-gray-900">{topic.active_periods || 0}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">总论文数</p>
            <p className="text-lg font-semibold text-gray-900">{topic.total_papers || 0}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">演化线索</p>
            <p className="text-lg font-semibold text-gray-900">{metrics.evolvesTo}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">这个主题是什么</p>
            <p className="text-sm text-slate-700 leading-6">{getTopicSummary(topic)}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">为什么这个 topic 值得看</p>
            <p className="text-sm text-amber-900 leading-6">{getWhyWorthWatching(topic, metrics)}</p>
          </div>
        </div>

        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2">状态说明</h5>
          {storyStatuses.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {storyStatuses.map((statusKey) => (
                  <span
                    key={statusKey}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[statusKey].className}`}
                  >
                    {STATUS_BADGES[statusKey].label}
                  </span>
                ))}
              </div>
              <div className="space-y-1">
                {storyStatuses.map((statusKey) => (
                  <p key={`${statusKey}-helper`} className="text-xs text-gray-500 leading-5">
                    {STATUS_BADGES[statusKey].helper}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 leading-5">
              当前没有直接演化状态标签；这张卡片主要用于解释主题画像和背景结构。
            </p>
          )}
        </div>

        {topic.keywords && topic.keywords.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">关键词</h5>
            <div className="flex flex-wrap gap-1.5">
              {topic.keywords.slice(0, 10).map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                >
                  {keyword}
                </span>
              ))}
              {topic.keywords.length > 10 && (
                <span className="text-xs text-gray-400">+{topic.keywords.length - 10} 更多</span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">关系怎么讲</h5>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-700 leading-6">{getRelationshipOverview(metrics)}</p>
            </div>
          </div>

          {metrics.evolvesTo > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              {metrics.confirmed > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700">{metrics.confirmed} 已确认</span>
              )}
              {metrics.ambiguous > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">{metrics.ambiguous} 待复核</span>
              )}
              {metrics.inferred > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{metrics.inferred} preview 候选</span>
              )}
              {metrics.negative > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">{metrics.negative} 已排除</span>
              )}
            </div>
          )}

          {outgoingMainEdges.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">它向外延展的主线 ({outgoingMainEdges.length})</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {outgoingMainEdges.slice(0, 8).map((edge, index) => (
                  <EdgeItem key={`out-${index}`} edge={edge} direction="out" topicLookup={topicLookup} />
                ))}
                {outgoingMainEdges.length > 8 && (
                  <p className="text-xs text-gray-400 text-center">+{outgoingMainEdges.length - 8} 更多</p>
                )}
              </div>
            </div>
          )}

          {incomingMainEdges.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">它承接的主线 ({incomingMainEdges.length})</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {incomingMainEdges.slice(0, 8).map((edge, index) => (
                  <EdgeItem key={`in-${index}`} edge={edge} direction="in" topicLookup={topicLookup} />
                ))}
                {incomingMainEdges.length > 8 && (
                  <p className="text-xs text-gray-400 text-center">+{incomingMainEdges.length - 8} 更多</p>
                )}
              </div>
            </div>
          )}

          {backgroundEdges.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">背景关系 ({backgroundEdges.length})</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {backgroundEdges.slice(0, 8).map(({ edge, direction }, index) => (
                  <EdgeItem key={`background-${index}`} edge={edge} direction={direction} topicLookup={topicLookup} />
                ))}
                {backgroundEdges.length > 8 && (
                  <p className="text-xs text-gray-400 text-center">+{backgroundEdges.length - 8} 更多</p>
                )}
              </div>
            </div>
          )}

          {allEdges.length === 0 && (
            <div className="text-center py-6 text-gray-400">
              <p className="text-sm font-medium mb-1">当前暂无图谱关系</p>
              <p className="text-xs">这个主题目前主要作为独立卡片展示，还没有进入可讲的主关系链。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TopicDetail;
