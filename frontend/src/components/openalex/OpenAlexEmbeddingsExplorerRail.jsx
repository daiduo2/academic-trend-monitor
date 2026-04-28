function formatCount(value) {
  return new Intl.NumberFormat('en-US').format(value || 0);
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
      {children}
    </p>
  );
}

function MetricTile({ label, value, tone = 'slate' }) {
  const tones = {
    amber: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    blue: 'border-sky-400/30 bg-sky-500/10 text-sky-100',
    emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    slate: 'border-slate-700 bg-slate-900/80 text-slate-100',
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone] || tones.slate}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ViewModeButton({ label, active = false, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
        active
          ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
          : 'border-slate-700 bg-slate-900/80 text-slate-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {label}
    </button>
  );
}

function SemanticBadge({ children, tone = 'slate' }) {
  const tones = {
    amber: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    sky: 'border-sky-400/30 bg-sky-500/10 text-sky-100',
    slate: 'border-slate-700 bg-slate-900 text-slate-300',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function SearchMatches({ query, matches, selectedTopicId, onSelectTopic }) {
  if (!query) {
    return (
      <p className="text-sm leading-6 text-slate-400">
        Search labels, aliases, field names, or subfields. The right panel stays empty until a topic is selected.
      </p>
    );
  }

  if (!matches.length) {
    return (
      <p className="text-sm leading-6 text-amber-200">
        No topics matched this query inside the current field filter. Try a shorter alias or switch back to `All fields`.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {matches.map((topic) => (
        <button
          key={topic.id}
          type="button"
          onClick={() => onSelectTopic(topic.id)}
          className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
            selectedTopicId === topic.id
              ? 'border-sky-400/60 bg-sky-500/15 text-sky-50'
              : 'border-slate-800 bg-slate-900/80 text-slate-100 hover:border-slate-600 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{topic.label}</p>
              <p className="mt-1 text-xs text-slate-400">
                {topic.fieldLabel} / {topic.subfieldLabel}
              </p>
            </div>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
              topic.isTrunk
                ? 'bg-slate-100 text-slate-900'
                : 'bg-slate-800 text-slate-300'
            }`}
            >
              {topic.isTrunk ? 'Trunk' : 'Leaf'}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function SemanticAssistMatches({
  query,
  semanticAssist,
  selectedTopicId,
  onSelectTopic,
}) {
  if (!query) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel>Semantic Assist</SectionLabel>
        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Click to select</span>
      </div>

      <p className="text-sm leading-6 text-slate-400">
        Local semantic suggestions complement lexical Top Matches. Pressing Enter still keeps the lexical baseline.
      </p>

      {semanticAssist.loading ? (
        <p className="text-sm leading-6 text-slate-400">
          Querying the local semantic sidecar for related topics...
        </p>
      ) : null}

      {!semanticAssist.loading && semanticAssist.status === 'unavailable' ? (
        <div className="rounded-[20px] border border-slate-800 bg-slate-900/80 p-4 text-sm leading-6 text-slate-300">
          {semanticAssist.message}
        </div>
      ) : null}

      {!semanticAssist.loading && semanticAssist.status === 'error' ? (
        <div className="rounded-[20px] border border-red-400/25 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
          {semanticAssist.message}
        </div>
      ) : null}

      {!semanticAssist.loading && semanticAssist.status === 'ready' && semanticAssist.widenedBeyondFieldFilter ? (
        <div className="rounded-[20px] border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          No semantic suggestions landed inside the current field filter, so this assist widened back to the accepted full inventory.
        </div>
      ) : null}

      {!semanticAssist.loading && semanticAssist.status === 'ready' && !semanticAssist.matches.length ? (
        <p className="text-sm leading-6 text-slate-400">
          No semantic suggestions were returned for this query. Lexical Top Matches remain the baseline.
        </p>
      ) : null}

      {!semanticAssist.loading && semanticAssist.status === 'ready' && semanticAssist.matches.length ? (
        <div className="space-y-2">
          {semanticAssist.matches.map((topic) => (
            <button
              key={`semantic-${topic.id}`}
              type="button"
              onClick={() => onSelectTopic(topic.id)}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                selectedTopicId === topic.id
                  ? 'border-sky-400/60 bg-sky-500/15 text-sky-50'
                  : 'border-slate-800 bg-slate-900/80 text-slate-100 hover:border-slate-600 hover:bg-slate-900'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{topic.label}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Local semantic score {topic.score.toFixed(3)}
                    </p>
                  </div>
                  <SemanticBadge tone={topic.isTrunk ? 'sky' : 'emerald'}>
                    {topic.nodeKindLabel}
                  </SemanticBadge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <SemanticBadge tone="amber">{topic.fieldLabel}</SemanticBadge>
                  <SemanticBadge>{topic.subfieldLabel}</SemanticBadge>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function OpenAlexEmbeddingsExplorerRail({
  embeddings,
  searchQuery,
  fieldFilter,
  labelMode,
  searchMatches,
  semanticAssist,
  selectedTopic,
  selectedTopicId,
  visibleTopicCount,
  onSearchChange,
  onFieldFilterChange,
  onLabelModeChange,
  onSelectTopic,
  onSubmitSearch,
  onResetView,
  onClearSelection,
}) {
  return (
    <aside className="rounded-[28px] border border-slate-800 bg-slate-950 text-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
      <div className="space-y-6 p-5">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-950">
              2D default
            </span>
            <span className="inline-flex rounded-full bg-sky-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-100">
              Math-primary preview
            </span>
            <span className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-100">
              Candidate only
            </span>
          </div>

          <div className="space-y-2">
            <SectionLabel>Explorer Rail</SectionLabel>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">OpenAlex topic-space explorer</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Search-first navigation over works whose primary OpenAlex topic is in Mathematics. Default labels are
                drawn from the Mathematics trunk of {formatCount(embeddings.stats.trunk_topic_count)} topics, while
                cross-field leaves stay as local context on those same math-primary works.
              </p>
            </div>
          </div>
        </div>

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitSearch();
          }}
        >
          <SectionLabel>Topic Search</SectionLabel>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search labels, aliases, field, or subfield"
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
          />
        </form>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <SectionLabel>Field Filter</SectionLabel>
            <select
              value={fieldFilter}
              onChange={(event) => onFieldFilterChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            >
              <option value="all">All fields</option>
              {embeddings.fieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <SectionLabel>Label Density</SectionLabel>
            <select
              value={labelMode}
              onChange={(event) => onLabelModeChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            >
              <option value="sparse">Sparse anchors</option>
              <option value="focus">Search + focus</option>
              <option value="dense">Dense (capped)</option>
            </select>
          </label>
        </div>

        <div className="space-y-3">
          <SectionLabel>View Posture</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <ViewModeButton label="2D active" active />
            <ViewModeButton label="3D deferred" disabled />
          </div>
          <button
            type="button"
            onClick={onResetView}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Reset view
          </button>
        </div>

        {selectedTopic ? (
          <div className="rounded-[24px] border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SectionLabel>Current Selection</SectionLabel>
                <p className="mt-2 text-sm font-semibold text-white">{selectedTopic.label}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedTopic.fieldLabel} / {selectedTopic.subfieldLabel}
                </p>
              </div>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                selectedTopic.isTrunk
                  ? 'bg-slate-100 text-slate-900'
                  : 'bg-emerald-500/15 text-emerald-100'
              }`}
              >
                {selectedTopic.isTrunk ? 'Trunk' : 'Leaf'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClearSelection}
              className="mt-4 inline-flex items-center rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Clear selection
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <MetricTile
            label="Total topics"
            value={formatCount(embeddings.stats.total_topic_count)}
            tone="slate"
          />
          <MetricTile
            label="Visible now"
            value={formatCount(visibleTopicCount)}
            tone="blue"
          />
          <MetricTile
            label="Trunk topics"
            value={formatCount(embeddings.stats.trunk_topic_count)}
            tone="amber"
          />
          <MetricTile
            label="Search hits"
            value={formatCount(searchMatches.length)}
            tone="emerald"
          />
        </div>

        <div className="rounded-[24px] border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          First load stays trunk-only and point-first: sparse labels come from the Mathematics trunk of
          {` ${formatCount(embeddings.stats.trunk_topic_count)}`} topics, while the
          {` ${formatCount(embeddings.stats.leaf_topic_count)}`} leaf topics remain candidate-only local sidecars until
          selection opens local overlay and evidence.
        </div>

        <div className="space-y-3">
          <SectionLabel>Top Matches</SectionLabel>
          <SearchMatches
            query={searchQuery.trim()}
            matches={searchMatches}
            selectedTopicId={selectedTopicId}
            onSelectTopic={onSelectTopic}
          />
        </div>

        <SemanticAssistMatches
          query={searchQuery.trim()}
          semanticAssist={semanticAssist}
          selectedTopicId={selectedTopicId}
          onSelectTopic={onSelectTopic}
        />
      </div>
    </aside>
  );
}
