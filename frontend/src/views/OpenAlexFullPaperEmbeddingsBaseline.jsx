import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import OpenAlexFullPaperEmbeddingsInspector from '../components/openalex/OpenAlexFullPaperEmbeddingsInspector';
import OpenAlexFullPaperLightPaperCloudPanel from '../components/openalex/OpenAlexFullPaperLightPaperCloudPanel';
import OpenAlexFullPaperLightPaperCloudViewport from '../components/openalex/OpenAlexFullPaperLightPaperCloudViewport';
import OpenAlexFullPaperTopicPeakGlobePanel from '../components/openalex/OpenAlexFullPaperTopicPeakGlobePanel';
import OpenAlexFullPaperTopicPeakGlobeViewport from '../components/openalex/OpenAlexFullPaperTopicPeakGlobeViewport';
import { useOpenAlexFullPaperEmbeddings } from '../hooks/useOpenAlexFullPaperEmbeddings';
import { useOpenAlexFullPaperLightPaperCloud } from '../hooks/useOpenAlexFullPaperLightPaperCloud';
import { useOpenAlexFullPaperTopicPeakGlobe } from '../hooks/useOpenAlexFullPaperTopicPeakGlobe';
import { searchOpenAlexFullPaperEmbeddings } from '../utils/openAlexFullPaperEmbeddingsBundle';

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

function SearchResultButton({ active = false, paper, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
        active
          ? 'border-sky-400/50 bg-sky-500/12 text-sky-50'
          : 'border-slate-800 bg-slate-950/70 text-slate-200 hover:border-slate-600 hover:bg-slate-900'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{paper.title || 'Untitled work'}</p>
          <p className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400">
            {paper.workId}
          </p>
        </div>
        <span className="shrink-0 text-xs text-slate-400">{paper.publicationYear || 'Unknown'}</span>
      </div>
    </button>
  );
}

function getTopicKey(topic) {
  return topic?.topicId || null;
}

function getBundleTopics(bundle, topicOptions = null) {
  const topics = Array.isArray(topicOptions)
    ? topicOptions
    : Array.isArray(bundle?.topics)
      ? bundle.topics
      : [];

  return topics.filter((topic) => getTopicKey(topic));
}

function resolveTopic(bundle, topicId, topicOptions = null) {
  const topics = Array.isArray(topicOptions)
    ? topicOptions
    : Array.isArray(bundle?.topics)
      ? bundle.topics
      : [];

  if (!topics.length) {
    return null;
  }

  if (topicId) {
    if (bundle?.topicById?.[topicId]) {
      return bundle.topicById[topicId];
    }

    const matchedTopic = topics.find((topic) => getTopicKey(topic) === topicId) || null;

    if (matchedTopic) {
      return bundle?.topicById?.[getTopicKey(matchedTopic)] || matchedTopic;
    }
  }

  return bundle?.topicById?.[getTopicKey(topics[0])] || topics[0] || null;
}

function buildBundleStatusMessage(status, message, fallback) {
  if (status === 'loading') {
    return 'Loading the local macro bundle...';
  }

  return message || fallback;
}

function MacroFallback({ eyebrow, message, title }) {
  return (
    <div className="flex min-h-[720px] items-center justify-center px-6 py-10">
      <div className="max-w-xl rounded-[28px] border border-slate-800 bg-slate-950/90 p-6 text-slate-100 shadow-[0_24px_70px_rgba(2,6,23,0.45)]">
        <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-4 text-sm leading-6 text-slate-300">{message}</p>
      </div>
    </div>
  );
}

function PaperInspectorPlaceholder() {
  return (
    <div className="rounded-[24px] border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm leading-6 text-slate-300">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">Paper inspector</p>
      <p className="mt-3">
        Local search stays independent from the macro tabs. Select a paper result to inspect one work without forcing the page back into a raw paper-cloud macro mode.
      </p>
    </div>
  );
}

export default function OpenAlexFullPaperEmbeddingsBaseline() {
  const [macroTab, setMacroTab] = useState('topic-peak-globe');
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [hoverTopicId, setHoverTopicId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaperId, setSelectedPaperId] = useState(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const {
    error,
    fullPaperEmbeddings,
    loading,
    message,
    status,
  } = useOpenAlexFullPaperEmbeddings();
  const {
    lightPaperCloud,
    message: lightCloudMessage,
    status: lightCloudStatus,
  } = useOpenAlexFullPaperLightPaperCloud();
  const {
    message: topicPeakMessage,
    status: topicPeakStatus,
    topicPeakGlobe,
  } = useOpenAlexFullPaperTopicPeakGlobe();
  const peakTopics = useMemo(() => getBundleTopics(topicPeakGlobe), [topicPeakGlobe]);
  const cloudTopics = useMemo(() => getBundleTopics(lightPaperCloud), [lightPaperCloud]);
  const peakTopicIds = useMemo(
    () => peakTopics.map((topic) => getTopicKey(topic)).filter(Boolean),
    [peakTopics],
  );
  const cloudTopicIds = useMemo(
    () => cloudTopics.map((topic) => getTopicKey(topic)).filter(Boolean),
    [cloudTopics],
  );

  useEffect(() => {
    const allTopicIds = [...new Set([...peakTopicIds, ...cloudTopicIds])];

    if (!allTopicIds.length) {
      setActiveTopicId(null);
      setHoverTopicId(null);
      return;
    }

    setActiveTopicId((currentTopicId) => {
      if (currentTopicId && allTopicIds.includes(currentTopicId)) {
        return currentTopicId;
      }

      return peakTopicIds[0] || cloudTopicIds[0] || null;
    });

    setHoverTopicId((currentTopicId) => (
      currentTopicId && allTopicIds.includes(currentTopicId)
        ? currentTopicId
        : null
    ));
  }, [cloudTopicIds, peakTopicIds]);

  useEffect(() => {
    if (!selectedPaperId) {
      return;
    }

    if (!fullPaperEmbeddings?.papersById?.[selectedPaperId]) {
      setSelectedPaperId(null);
    }
  }, [fullPaperEmbeddings, selectedPaperId]);

  const papers = useMemo(
    () => (Array.isArray(fullPaperEmbeddings?.papers) ? fullPaperEmbeddings.papers : []),
    [fullPaperEmbeddings],
  );
  const searchResults = useMemo(
    () => searchOpenAlexFullPaperEmbeddings(papers, deferredSearchQuery, 6),
    [deferredSearchQuery, papers],
  );
  const selectedPaper = useMemo(() => {
    if (!fullPaperEmbeddings || !selectedPaperId) {
      return null;
    }

    return fullPaperEmbeddings.papersById?.[selectedPaperId] || null;
  }, [fullPaperEmbeddings, selectedPaperId]);
  const selectedPaperColor = useMemo(() => {
    if (!fullPaperEmbeddings || !selectedPaper) {
      return null;
    }

    return fullPaperEmbeddings.topicColorById?.[selectedPaper.primaryTopicId] || '#f8fafc';
  }, [fullPaperEmbeddings, selectedPaper]);
  const selectedPeakTopic = useMemo(
    () => resolveTopic(topicPeakGlobe, activeTopicId, peakTopics),
    [activeTopicId, peakTopics, topicPeakGlobe],
  );
  const hoveredPeakTopic = useMemo(
    () => (hoverTopicId ? resolveTopic(topicPeakGlobe, hoverTopicId, peakTopics) : null),
    [hoverTopicId, peakTopics, topicPeakGlobe],
  );
  const activePeakTopic = hoveredPeakTopic || selectedPeakTopic || resolveTopic(topicPeakGlobe, null, peakTopics);
  const selectedCloudTopic = useMemo(
    () => resolveTopic(lightPaperCloud, activeTopicId, cloudTopics),
    [activeTopicId, cloudTopics, lightPaperCloud],
  );
  const hoveredCloudTopic = useMemo(
    () => (hoverTopicId ? resolveTopic(lightPaperCloud, hoverTopicId, cloudTopics) : null),
    [hoverTopicId, cloudTopics, lightPaperCloud],
  );
  const activeCloudTopic = hoveredCloudTopic || selectedCloudTopic || resolveTopic(lightPaperCloud, null, cloudTopics);
  const trimmedSearchQuery = deferredSearchQuery.trim();

  if (loading) {
    return (
      <section className="rounded-[32px] border border-slate-800 bg-slate-950 p-8 text-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
        <div className="flex min-h-[640px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-sky-400" />
            <p className="mt-4 text-sm text-slate-400">Loading the local full-paper title-only baseline...</p>
          </div>
        </div>
      </section>
    );
  }

  if (status === 'error' || error) {
    return (
      <section className="rounded-[32px] border border-red-400/30 bg-slate-950 p-8 text-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
        <div className="max-w-2xl space-y-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-200">Baseline Unavailable</p>
          <h1 className="text-2xl font-semibold text-white">OpenAlex full-paper title baseline</h1>
          <p className="text-sm leading-6 text-red-100">
            {message || error?.message || 'The local full-paper title-only baseline bundle could not be loaded.'}
          </p>
        </div>
      </section>
    );
  }

  if (status === 'unavailable' || !fullPaperEmbeddings) {
    return (
      <section className="rounded-[32px] border border-slate-800 bg-slate-950 p-8 text-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
        <div className="max-w-2xl space-y-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Baseline Hold</p>
          <h1 className="text-2xl font-semibold text-white">OpenAlex full-paper title baseline</h1>
          <p className="text-sm leading-6 text-slate-300">
            {message || 'The full-paper title-only baseline is currently available through the local Vite dev bridge only.'}
          </p>
        </div>
      </section>
    );
  }

  const stats = fullPaperEmbeddings.stats || {};
  const source = fullPaperEmbeddings.source || {};
  const peakTopicCount = peakTopics.length;
  const cloudTopicCount = cloudTopics.length;
  const isPeakReady = topicPeakStatus === 'ready' && peakTopicCount > 0;
  const isCloudReady = lightCloudStatus === 'ready' && cloudTopicCount > 0;
  const peakTabMessage = buildBundleStatusMessage(
    topicPeakStatus,
    topicPeakMessage,
    'The topic peak globe bundle is unavailable or malformed. Switch to Light Paper Cloud to keep inspecting the macro surface.',
  );
  const cloudTabMessage = lightCloudStatus === 'ready' && cloudTopicCount === 0
    ? 'The light paper cloud bundle is unavailable or malformed. Switch to Topic Peak Globe to keep inspecting the macro surface.'
    : buildBundleStatusMessage(
      lightCloudStatus,
      lightCloudMessage,
      'The light paper cloud bundle is unavailable or malformed. Switch to Topic Peak Globe to keep inspecting the macro surface.',
    );
  const macroPosture = macroTab === 'topic-peak-globe'
    ? (
      isPeakReady
        ? 'Topic Peak Globe opens by default and keeps one topic as one peak. Hover and selection stay topic-scoped and do not auto-switch the light cloud.'
        : peakTabMessage
    )
    : (
      isCloudReady
        ? 'Light Paper Cloud stays lightweight by sampling papers first, then brightening only the selected topic overlay without changing the peak-globe state model.'
        : cloudTabMessage
    );
  const handleSearchSelect = (paper) => {
    if (!paper) {
      return;
    }

    setSelectedPaperId(paper.id);
  };
  const handleReset = () => {
    setHoverTopicId(null);
    setActiveTopicId(
      macroTab === 'topic-peak-globe'
        ? (peakTopicIds[0] || null)
        : (cloudTopicIds[0] || null),
    );
  };

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950 text-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-950">
              title_only_baseline
            </span>
            <span className="inline-flex rounded-full bg-sky-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-100">
              topic-peak default
            </span>
            <span className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-100">
              dual macro tabs
            </span>
            <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-100">
              {source.selection_mode || 'full_math_works_core'}
            </span>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{source.ingest_run_id || 'Unknown run'}</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">OpenAlex full-paper title baseline</h1>
              <p className="max-w-5xl text-sm leading-6 text-slate-300">
                Global full-math paper-space probe over the accepted works-core bundle. This route keeps paper search local while exposing two independent precomputed macro views: one topic-level peak globe and one lightweight sampled paper cloud.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        data-testid="baseline-content-shell"
        className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]"
      >
        <div
          data-testid="baseline-sidebar-shell"
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="rounded-[24px] border border-slate-800 bg-slate-900/70 px-4 py-4">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">Find paper</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title or work id across the accepted cohort"
                className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/50"
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Local lexical search only. Search updates the paper inspector but does not auto-switch macro tabs or claim semantic-neighbor truth.
            </p>

            {trimmedSearchQuery ? (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <span>Top local matches</span>
                  <span>{searchResults.length}</span>
                </div>
                {searchResults.length ? (
                  <div className="space-y-2">
                    {searchResults.map((paper) => (
                      <SearchResultButton
                        key={paper.id}
                        active={selectedPaperId === paper.id}
                        paper={paper}
                        onClick={() => handleSearchSelect(paper)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4 text-sm text-slate-400">
                    No local title/work id matches were found in the accepted cohort.
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {selectedPaper ? (
            <OpenAlexFullPaperEmbeddingsInspector
              paper={selectedPaper}
              paperColor={selectedPaperColor}
              onClear={() => setSelectedPaperId(null)}
            />
          ) : (
            <PaperInspectorPlaceholder />
          )}

          <div className="rounded-[24px] border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm leading-6 text-slate-300">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">Macro posture</p>
            <p className="mt-3">{macroPosture}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile label="Papers" tone="sky" value={(stats.total_paper_count || 0).toLocaleString()} />
            <MetricTile label="Primary Topics" tone="emerald" value={(stats.distinct_primary_topic_count || 0).toLocaleString()} />
            <MetricTile label="Peak Topics" tone="amber" value={peakTopicCount.toLocaleString()} />
            <MetricTile label="Cloud Topics" value={cloudTopicCount.toLocaleString()} />
          </div>

          <div className="rounded-[24px] border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm leading-6 text-slate-300">
            <p className="font-medium text-slate-100">Interpretation guardrail</p>
            <p className="mt-2">
              This is the accepted full-math <code>title_only_baseline</code> bundle rendered as one bounded local route. Treat the topic peak globe and light paper cloud views as precomputed macro inspection surfaces only, and treat paper search as local metadata inspection only.
            </p>
            <p className="mt-2">
              The default peak globe keeps one topic as one peak with a fixed footprint, while the second tab reuses a deterministic sampled paper-space cloud instead of rebuilding heavy topic bodies.
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <ViewModeButton
                active={macroTab === 'topic-peak-globe'}
                onClick={() => setMacroTab('topic-peak-globe')}
              >
                Topic Peak Globe
              </ViewModeButton>
              <ViewModeButton
                active={macroTab === 'light-paper-cloud'}
                onClick={() => setMacroTab('light-paper-cloud')}
              >
                Light Paper Cloud
              </ViewModeButton>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Reset selection
            </button>
          </div>

          <div
            data-testid="macro-canvas-shell"
            className="h-[840px] overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900/40 p-4"
          >
            <div
              data-testid="macro-stage-shell"
              className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]"
            >
              <div
                data-testid="macro-viewport-shell"
                className="min-h-0 overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950/55"
              >
                {macroTab === 'topic-peak-globe' ? (
                  isPeakReady ? (
                    <OpenAlexFullPaperTopicPeakGlobeViewport
                      activeTopicId={getTopicKey(activePeakTopic)}
                      onHoverTopic={(topic) => setHoverTopicId(getTopicKey(topic))}
                      onSelectTopic={setActiveTopicId}
                      topicPeakGlobe={topicPeakGlobe}
                    />
                  ) : (
                    <MacroFallback
                      eyebrow="Topic Peak Globe"
                      message={peakTabMessage}
                      title="Topic peak globe unavailable"
                    />
                  )
                ) : (
                  isCloudReady ? (
                    <OpenAlexFullPaperLightPaperCloudViewport
                      bundle={lightPaperCloud}
                      onHoverTopic={(topic) => setHoverTopicId(getTopicKey(topic))}
                      onSelectTopic={(topic) => setActiveTopicId(getTopicKey(topic))}
                      selectedTopicId={getTopicKey(activeCloudTopic)}
                    />
                  ) : (
                    <MacroFallback
                      eyebrow="Light Paper Cloud"
                      message={cloudTabMessage}
                      title="Light paper cloud unavailable"
                    />
                  )
                )}
              </div>

              <div
                data-testid="macro-panel-shell"
                className="min-h-0 overflow-auto"
              >
                {macroTab === 'topic-peak-globe' ? (
                  isPeakReady ? <OpenAlexFullPaperTopicPeakGlobePanel topic={activePeakTopic} /> : null
                ) : (
                  isCloudReady ? <OpenAlexFullPaperLightPaperCloudPanel topic={activeCloudTopic} /> : null
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
