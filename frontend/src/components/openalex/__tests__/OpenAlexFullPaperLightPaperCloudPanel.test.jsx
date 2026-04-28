// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import OpenAlexFullPaperLightPaperCloudPanel from '../OpenAlexFullPaperLightPaperCloudPanel';

afterEach(() => {
  cleanup();
});

describe('OpenAlexFullPaperLightPaperCloudPanel', () => {
  it('renders guidance when no topic is hovered or selected', () => {
    render(<OpenAlexFullPaperLightPaperCloudPanel />);

    expect(screen.getByRole('heading', { name: '文献点云详情' })).toBeTruthy();
    expect(screen.getByText(/在点云中悬停或选择一个主题/i)).toBeTruthy();
    expect(screen.getByText(/高区分度主题颜色和标签/i)).toBeTruthy();
  });

  it('renders topic stats and total citations in the light cloud panel', () => {
    render(
      <OpenAlexFullPaperLightPaperCloudPanel
        topic={{
          averageCitations: 11.375,
          paperCount: 32,
          subfieldDisplayName: 'Statistics and Probability',
          topicDisplayName: 'Bayesian Inference',
          topicId: 'T10243',
          totalCitations: 364,
        }}
      />,
    );

    expect(screen.getByText('Bayesian Inference')).toBeTruthy();
    expect(screen.getAllByText('Statistics and Probability').length).toBeGreaterThan(0);
    expect(screen.getByText('32')).toBeTruthy();
    expect(screen.getByText('11.38')).toBeTruthy();
    expect(screen.getByText('364')).toBeTruthy();
    expect(screen.getByText('T10243')).toBeTruthy();
    expect(screen.getByText('平均引用数')).toBeTruthy();
    expect(screen.getByText('子领域')).toBeTruthy();
    expect(screen.getByText('总引用数')).toBeTruthy();
  });

  it('renders a selectable topic candidate list with hide-other toggle', () => {
    const onToggleTopic = vi.fn();
    const onClearTopics = vi.fn();
    const onToggleHideUnselected = vi.fn();

    render(
      <OpenAlexFullPaperLightPaperCloudPanel
        hideUnselectedTopics={false}
        onClearTopics={onClearTopics}
        onToggleHideUnselected={onToggleHideUnselected}
        onToggleTopic={onToggleTopic}
        selectedTopicIds={['T2']}
        topics={[
          {
            paperCount: 18,
            sampledPointIndices: [0, 1],
            subfieldDisplayName: 'Statistics and Probability',
            topicDisplayName: 'Bayesian Inference',
            topicId: 'T1',
          },
          {
            paperCount: 32,
            sampledPointIndices: [2, 3],
            subfieldDisplayName: 'Geometry and Topology',
            topicDisplayName: 'Graph Theory',
            topicId: 'T2',
          },
        ]}
        topic={{
          averageCitations: 11.375,
          paperCount: 32,
          subfieldDisplayName: 'Geometry and Topology',
          topicDisplayName: 'Graph Theory',
          topicId: 'T2',
          totalCitations: 364,
        }}
      />,
    );

    expect(screen.getByText('候选领域')).toBeTruthy();
    expect(screen.getByLabelText(/Bayesian Inference/i)).toBeTruthy();
    expect(screen.getByLabelText(/Graph Theory/i).checked).toBe(true);

    fireEvent.click(screen.getByLabelText(/Bayesian Inference/i));
    expect(onToggleTopic).toHaveBeenCalledWith('T1');

    fireEvent.click(screen.getByLabelText(/隐藏其他领域/i));
    expect(onToggleHideUnselected).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: /清空选择/i }));
    expect(onClearTopics).toHaveBeenCalled();
  });
});
