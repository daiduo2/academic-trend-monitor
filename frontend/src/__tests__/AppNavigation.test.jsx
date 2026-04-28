// @vitest-environment jsdom

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import App from '../App';

vi.mock('../views/DomainDashboard', () => ({
  default: () => <div>领域热度分析页面</div>,
}));

vi.mock('../views/TimeDashboard', () => ({
  default: () => <div>趋势追踪分析页面</div>,
}));

vi.mock('../pages/RSSSubscription', () => ({
  RSSSubscription: () => <div>RSS 页面</div>,
}));

vi.mock('../views/KnowledgeGraph', () => ({
  default: () => <div>知识图谱页面</div>,
}));

vi.mock('../views/OpenAlexGraph', () => ({
  default: () => <div>OpenAlex 图谱页面</div>,
}));

vi.mock('../views/OpenAlexEmbeddings', () => ({
  default: () => <div>OpenAlex 嵌入页面</div>,
}));

vi.mock('../views/OpenAlexPaperCloud', () => ({
  default: () => <div>文献点云图页面</div>,
}));

vi.mock('../views/OpenAlexFieldHeat', () => ({
  default: () => <div>领域热力图页面</div>,
}));

vi.mock('../views/OpenAlexPaperEmbeddingsPilot', () => ({
  default: () => <div>OpenAlex 论文试点页面</div>,
}));

vi.mock('../views/OpenAlexFullPaperEmbeddingsBaseline', () => ({
  default: () => <div>OpenAlex 全量论文基线页面</div>,
}));

function renderAt(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App navigation', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps the two arXiv dashboards and adds only the two selected OpenAlex views to primary navigation', async () => {
    const { container } = renderAt('/');

    expect(screen.getByRole('link', { name: '领域热度分析' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '趋势追踪分析' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '文献点云图' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '领域热力图' })).toBeTruthy();

    expect(screen.queryByRole('link', { name: 'RSS订阅' })).toBeNull();
    expect(screen.queryByRole('link', { name: '知识图谱' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'OpenAlex图谱' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'OpenAlex嵌入' })).toBeNull();

    await waitFor(() => {
      expect(screen.getByText('领域热度分析页面')).toBeTruthy();
    });

    expect(container.querySelector('[data-testid="app-shell"]').className).toContain('bg-slate-950');
    expect(screen.getByRole('banner').className).toContain('border-slate-800');
  });

  it('routes the paper cloud entry to the OpenAlex paper cloud view', async () => {
    renderAt('/openalex-paper-cloud');

    await waitFor(() => {
      expect(screen.getByText('文献点云图页面')).toBeTruthy();
    });
  });

  it('routes the field heat entry to the OpenAlex field heat view', async () => {
    renderAt('/openalex-field-heat');

    await waitFor(() => {
      expect(screen.getByText('领域热力图页面')).toBeTruthy();
    });
  });
});
