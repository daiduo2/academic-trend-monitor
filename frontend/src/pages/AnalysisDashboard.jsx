import React from 'react';
import { useDailyAnalysis } from '../hooks/useDailyAnalysis';

export function AnalysisDashboard() {
  const { analysis, loading, error } = useDailyAnalysis();

  if (loading) {
    return <div className="text-gray-500">加载今日分析...</div>;
  }

  if (error || !analysis) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-xl font-semibold">今日分析暂不可用</h2>
        <p className="mt-2 text-sm">{error || '尚未生成分析文件。'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Daily Analysis</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{analysis.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">{analysis.summary}</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">主要发现</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {analysis.key_findings.map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-lg bg-slate-50 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">风险与注意点</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {analysis.risks.length ? analysis.risks.map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-lg bg-rose-50 px-4 py-3 text-rose-900">
                {item}
              </li>
            )) : <li className="rounded-lg bg-slate-50 px-4 py-3">暂无额外风险提示。</li>}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">上升最快主题</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {analysis.top_rising_topics.map(topic => (
            <article key={`${topic.topic_id}-${topic.topic_name}`} className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Topic {topic.topic_id}</p>
              <h3 className="mt-2 text-base font-semibold text-slate-900">{topic.topic_name}</h3>
              <p className="mt-2 text-sm text-slate-700">{topic.summary}</p>
              <p className="mt-3 text-sm text-sky-700">近期 {topic.paper_count ?? 0} 篇，变化 {topic.change ?? 0}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">值得关注的论文</h2>
          <div className="mt-4 space-y-3">
            {analysis.notable_papers.map(paper => (
              <article key={paper.arxiv_id} className="rounded-lg bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">{paper.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{paper.arxiv_id}</p>
                <p className="mt-2 text-sm text-slate-700">{paper.reason}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">关键信号</h2>
          <div className="mt-4 space-y-3">
            {analysis.signals.map((signal, index) => (
              <article key={`${signal.label}-${index}`} className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{signal.kind}</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-900">{signal.label}</h3>
                <p className="mt-2 text-sm text-slate-700">{signal.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
