import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import OpenAlexPaperEmbeddingsInspector from '../components/openalex/OpenAlexPaperEmbeddingsInspector';
import OpenAlexPaperEmbeddingsViewport from '../components/openalex/OpenAlexPaperEmbeddingsViewport';
import { useOpenAlexTopicPaperEmbeddings } from '../hooks/useOpenAlexTopicPaperEmbeddings';
import { rankOpenAlexTopicPaperMatches } from '../utils/openAlexTopicPaperEmbeddingsBundle';

function ViewModeButton({ active = false, children, disabled = false, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
        active
          ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
          : 'border-slate-700 bg-slate-900/80 text-slate-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-slate-500 hover:bg-slate-800'}`}
    >
      {children}
    </button>
  );
}

function MetricTile({ label, value, tone = 'slate' }) {
  const tones = {
    amber: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    sky: 'border-sky-400/30 bg-sky-500/10 text-sky-100',
    slate: 'border-slate-800 bg-slate-900/80 text-slate-100',
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone] || tones.slate}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function OpenAlexPaperEmbeddingsPilot() {
  const {
    error,
    loading,
    message,
    paperEmbeddings,
    status,
  } = useOpenAlexTopicPaperEmbeddings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [viewMode, setViewMode] = useState('3d');
  const [cameraResetToken, setCameraResetToken] = useState(0);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    if (!paperEmbeddings) {
      return;
    }

    if (!paperEmbeddings?.availableViewModes?.includes(viewMode)) {
      setViewMode(paperEmbeddings?.availableViewModes?.[0] || '2d');
    }
  }, [paperEmbeddings, viewMode]);

  const searchMatches = useMemo(
    () => rankOpenAlexTopicPaperMatches(paperEmbeddings, deferredSearchQuery, { limit: 8 }),
    [deferredSearchQuery, paperEmbeddings],
  );

  const searchMatchIds = useMemo(
    () => new Set(searchMatches.map((paper) => paper.id)),
    [searchMatches],
  );

  const selectedPaper = selectedWorkId ? paperEmbeddings?.papersById?.[selectedWorkId] || null : null;

  const handleSubmitSearch = useCallback(() => {
    if (searchMatches[0]) {
      setSelectedWorkId(searchMatches[0].id);
    }
  }, [searchMatches]);

  if (loading) {
    return (
      <section className="rounded-[32px] border border-slate-800 bg-slate-950 p-8 text-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
        <div className="flex min-h-[640px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-sky-400" />
            <p className="mt-4 text-sm text-slate-400">Loading the local paper-space pilot bundle...</p>
          </div>
        </div>
      </section>
    );
  }

  if (status === 'error' || error) {
    return (
      <section className="rounded-[32px] border border-red-400/30 bg-slate-950 p-8 text-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
        <div className="max-w-2xl space-y-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-200">Paper Pilot Unavailable</p>
          <h1 className="text-2xl font-semibold text-white">OpenAlex paper-space pilot</h1>
          <p className="text-sm leading-6 text-red-100">
            {message || error?.message || 'The local paper-space pilot bundle could not be loaded.'}
          </p>
        </div>
      </section>
    );
  }

  if (status === 'unavailable' || !paperEmbeddings) {
    return (
      <section className="rounded-[32px] border border-slate-800 bg-slate-950 p-8 text-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
        <div className="max-w-2xl space-y-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Paper Pilot Hold</p>
          <h1 className="text-2xl font-semibold text-white">OpenAlex paper-space pilot</h1>
          <p className="text-sm leading-6 text-slate-300">
            {message || 'The paper-space pilot is currently available through the local Vite dev bridge only.'}
          </p>
        </div>
      </section>
    );
  }

  const stats = paperEmbeddings.stats || {};
  const topicDisplayName = paperEmbeddings.source?.topic_display_name || 'Unknown topic';
  const topicId = paperEmbeddings.source?.topic_id || 'Unknown';

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950 text-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-950">
              Paper pilot
            </span>
            <span className="inline-flex rounded-full bg-sky-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-100">
              3D default
            </span>
            <span className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-100">
              Local-first
            </span>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{topicId}</p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">{topicDisplayName}</h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                  Single-topic paper-space pilot over the accepted primary-topic cohort. The viewport stays point-cloud-first, defaults into 3D, and keeps 2D as a stable fallback without opening citation mesh or force layout.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ViewModeButton
                active={viewMode === '3d'}
                disabled={!paperEmbeddings.availableViewModes.includes('3d')}
                onClick={() => setViewMode('3d')}
              >
                3D default
              </ViewModeButton>
              <ViewModeButton
                active={viewMode === '2d'}
                onClick={() => setViewMode('2d')}
              >
                2D fallback
              </ViewModeButton>
              <button
                type="button"
                onClick={() => setCameraResetToken((token) => token + 1)}
                className="inline-flex rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Reset view
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Papers" tone="sky" value={stats.total_paper_count || 0} />
            <MetricTile label="Abstract Present" tone="emerald" value={stats.abstract_available_count || 0} />
            <MetricTile label="Title Only" tone="amber" value={stats.title_only_count || 0} />
            <MetricTile label="Search Hits" value={searchMatches.length} />
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <form
              className="flex min-w-0 flex-1 items-center gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmitSearch();
              }}
            >
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title or work id inside this topic cohort"
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
              <button
                type="submit"
                className="inline-flex rounded-2xl border border-sky-400/40 bg-sky-500/15 px-4 py-3 text-sm font-medium text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-500/25"
              >
                Select top hit
              </button>
            </form>

            <div className="text-sm leading-6 text-slate-400">
              Search stays inside the accepted `T10243` cohort only. Selection and search survive 3D/2D toggles.
            </div>
          </div>

          {searchQuery.trim() ? (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Top Matches</p>
              <div className="flex flex-wrap gap-2">
                {searchMatches.length ? searchMatches.slice(0, 5).map((paper) => (
                  <button
                    key={paper.id}
                    type="button"
                    onClick={() => setSelectedWorkId(paper.id)}
                    className={`inline-flex max-w-full rounded-full border px-3 py-2 text-left text-xs transition ${
                      selectedWorkId === paper.id
                        ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
                        : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
                    }`}
                    title={paper.title}
                  >
                    <span className="truncate">{paper.title}</span>
                  </button>
                )) : (
                  <p className="text-sm text-slate-400">No local paper titles matched this query.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-[720px] flex-col xl:flex-row">
        <div className="min-h-[720px] min-w-0 flex-1">
          <OpenAlexPaperEmbeddingsViewport
            papers={paperEmbeddings.papers}
            coordinateBounds2d={paperEmbeddings.coordinateBounds2d}
            coordinateBounds3d={paperEmbeddings.coordinateBounds3d}
            resetCameraToken={cameraResetToken}
            searchMatchIds={searchMatchIds}
            selectedWorkId={selectedWorkId}
            viewMode={viewMode}
            onSelectPaper={setSelectedWorkId}
          />
        </div>

        {selectedPaper ? (
          <OpenAlexPaperEmbeddingsInspector
            paper={selectedPaper}
            topicDisplayName={topicDisplayName}
            onClearSelection={() => setSelectedWorkId(null)}
          />
        ) : null}
      </div>
    </section>
  );
}
