import React from 'react';

const metricToneClass = {
  amber: 'text-amber-300',
  emerald: 'text-emerald-300',
  rose: 'text-rose-300',
  sky: 'text-sky-300',
  slate: 'text-slate-100',
  violet: 'text-violet-300',
};

export function MetricCard({ label, value, tone = 'sky', helper = null }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 shadow-[0_12px_32px_rgba(2,6,23,0.24)]">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${metricToneClass[tone] || metricToneClass.sky}`}>{value}</p>
      {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
    </div>
  );
}

export function DashboardPanel({
  children,
  className = '',
  description = null,
  title = null,
}) {
  return (
    <section className={`rounded-[24px] border border-slate-800 bg-slate-950/88 p-5 text-slate-100 shadow-[0_18px_52px_rgba(2,6,23,0.28)] ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
          {description && <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function DashboardSelect({
  label,
  onChange,
  options = [],
  value,
}) {
  return (
    <label className="block text-sm font-medium text-slate-300">
      <span className="mb-2 block">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

export function DashboardShell({
  children,
  className = '',
  description,
  eyebrow,
  metrics = [],
  title,
}) {
  return (
    <div
      data-testid="dashboard-shell"
      className={`rounded-[32px] border border-slate-800/80 bg-slate-950 p-5 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.3)] ${className}`}
    >
      <div className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow && (
            <p className="text-[11px] uppercase tracking-[0.26em] text-sky-300/80">{eyebrow}</p>
          )}
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
          )}
        </div>
        {metrics.length > 0 && (
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-[280px]">
            {metrics.map((metric) => (
              <MetricCard
                key={`${metric.label}-${metric.value}`}
                label={metric.label}
                value={metric.value}
                tone={metric.tone}
                helper={metric.helper}
              />
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export default DashboardShell;
