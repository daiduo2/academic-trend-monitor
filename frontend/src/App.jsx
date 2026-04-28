import { Suspense, lazy } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';

const DomainDashboard = lazy(() => import('./views/DomainDashboard'));
const TimeDashboard = lazy(() => import('./views/TimeDashboard'));
const RSSSubscription = lazy(() => import('./pages/RSSSubscription').then((module) => ({ default: module.RSSSubscription })));
const KnowledgeGraph = lazy(() => import('./views/KnowledgeGraph'));
const OpenAlexGraph = lazy(() => import('./views/OpenAlexGraph'));
const OpenAlexEmbeddings = lazy(() => import('./views/OpenAlexEmbeddings'));
const OpenAlexPaperCloud = lazy(() => import('./views/OpenAlexPaperCloud'));
const OpenAlexFieldHeat = lazy(() => import('./views/OpenAlexFieldHeat'));
const OpenAlexPaperEmbeddingsPilot = lazy(() => import('./views/OpenAlexPaperEmbeddingsPilot'));
const OpenAlexFullPaperEmbeddingsBaseline = lazy(() => import('./views/OpenAlexFullPaperEmbeddingsBaseline'));

const PRIMARY_NAV_ITEMS = [
  { end: true, label: '领域热度分析', to: '/' },
  { label: '趋势追踪分析', to: '/trends' },
  { label: '文献点云图', to: '/openalex-paper-cloud' },
  { label: '领域热力图', to: '/openalex-field-heat' },
];

function RouteFallback() {
  return (
    <div className="min-h-[420px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-300 mx-auto mb-4" />
        <p className="text-sm text-slate-400">页面加载中...</p>
      </div>
    </div>
  );
}

function App() {
  const location = useLocation();
  const isWideOpenAlexRoute = [
    '/openalex-paper-cloud',
    '/openalex-field-heat',
    '/openalex-paper-embeddings-pilot',
    '/openalex-full-paper-embeddings-baseline',
  ].includes(location.pathname);

  return (
    <div
      data-testid="app-shell"
      className="min-h-screen bg-slate-950 text-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(124,58,237,0.14),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_46%,_#020617_100%)]"
    >
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/86 shadow-[0_12px_40px_rgba(2,6,23,0.28)] backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300/80">Academic Trend Monitor</p>
          <h1 className="mt-1 text-2xl font-bold text-white">学术趋势监测</h1>
          <p className="mt-1 text-sm text-slate-400">保留 arXiv 趋势仪表盘，并补充 OpenAlex 文献点云与领域热力视图</p>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-950/72 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-x-6">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `py-4 px-2 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-sky-300 text-sky-200'
                      : 'border-transparent text-slate-400 hover:text-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={isWideOpenAlexRoute ? 'w-full px-0 py-6' : 'max-w-7xl mx-auto px-4 py-8'}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<DomainDashboard />} />
            <Route path="/trends" element={<TimeDashboard />} />
            <Route path="/rss" element={<RSSSubscription />} />
            <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
            <Route path="/openalex-graph" element={<OpenAlexGraph />} />
            <Route path="/openalex-embeddings" element={<OpenAlexEmbeddings />} />
            <Route path="/openalex-paper-cloud" element={<OpenAlexPaperCloud />} />
            <Route path="/openalex-field-heat" element={<OpenAlexFieldHeat />} />
            <Route path="/openalex-paper-embeddings-pilot" element={<OpenAlexPaperEmbeddingsPilot />} />
            <Route path="/openalex-full-paper-embeddings-baseline" element={<OpenAlexFullPaperEmbeddingsBaseline />} />
          </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/78 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-center text-sm text-slate-500">
            Academic Trend Monitor - Data: {new Date().toLocaleDateString()}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
