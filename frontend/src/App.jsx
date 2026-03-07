import { Routes, Route, NavLink } from 'react-router-dom';
import DomainDashboard from './views/DomainDashboard';
import TimeDashboard from './views/TimeDashboard';
import { RSSSubscription } from './pages/RSSSubscription';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">学术趋势监测</h1>
          <p className="text-sm text-gray-500">基于 arXiv 论文的学术趋势分析 - BERTopic + LLM</p>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `py-4 px-2 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }
            >
              领域热度分析
            </NavLink>
            <NavLink
              to="/trends"
              className={({ isActive }) =>
                `py-4 px-2 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }
            >
              趋势追踪分析
            </NavLink>
            <NavLink
              to="/rss"
              className={({ isActive }) =>
                `py-4 px-2 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }
            >
              RSS订阅
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<DomainDashboard />} />
          <Route path="/trends" element={<TimeDashboard />} />
          <Route path="/rss" element={<RSSSubscription />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500">
            Academic Trend Monitor - Data: {new Date().toLocaleDateString()}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
