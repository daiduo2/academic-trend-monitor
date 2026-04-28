// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  DashboardPanel,
  DashboardSelect,
  DashboardShell,
  MetricCard,
} from '../DashboardShell';

afterEach(() => {
  cleanup();
});

describe('DashboardShell shared visual system', () => {
  it('renders a shared dark page shell with metrics and content', () => {
    render(
      <DashboardShell
        eyebrow="arXiv · domain dashboard"
        title="领域热度分析"
        description="选择月份和领域，查看该细分领域下的研究主题热度对比。"
        metrics={[
          { label: '主题数', value: 12, tone: 'sky' },
          { label: '论文数', value: '1,024', tone: 'emerald' },
        ]}
      >
        <div>chart panel</div>
      </DashboardShell>,
    );

    const shell = screen.getByTestId('dashboard-shell');
    expect(shell.className).toContain('bg-slate-950');
    expect(screen.getByText('arXiv · domain dashboard')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '领域热度分析' })).toBeTruthy();
    expect(screen.getByText('主题数')).toBeTruthy();
    expect(screen.getByText('1,024')).toBeTruthy();
    expect(screen.getByText('chart panel')).toBeTruthy();
  });

  it('renders reusable metric, panel, and dark select controls', () => {
    const handleChange = vi.fn();

    render(
      <DashboardPanel title="筛选条件" description="选择要观察的数据切片。">
        <MetricCard label="峰值" value={42} tone="violet" />
        <DashboardSelect
          label="月份"
          value="2026-04"
          onChange={handleChange}
          options={[
            { value: '2026-03', label: '2026-03' },
            { value: '2026-04', label: '2026-04' },
          ]}
        />
      </DashboardPanel>,
    );

    expect(screen.getByText('筛选条件')).toBeTruthy();
    expect(screen.getByText('峰值')).toBeTruthy();
    expect(screen.getByLabelText('月份').className).toContain('bg-slate-950');

    fireEvent.change(screen.getByLabelText('月份'), { target: { value: '2026-03' } });
    expect(handleChange).toHaveBeenCalled();
  });
});
