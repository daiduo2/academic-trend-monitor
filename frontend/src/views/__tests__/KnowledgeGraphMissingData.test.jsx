// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import KnowledgeGraph from '../KnowledgeGraph';

function htmlResponse() {
  return new Response('<!doctype html><html><body>SPA fallback</body></html>', {
    headers: {
      'Content-Type': 'text/html',
    },
    status: 200,
  });
}

describe('KnowledgeGraph missing local data state', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows a local data missing message instead of a raw JSON parse failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse()));

    render(<KnowledgeGraph />);

    await waitFor(() => {
      expect(screen.getByText('本地知识图谱数据未找到')).toBeTruthy();
    });

    expect(screen.queryByText('加载失败')).toBeNull();
    expect(screen.getByText('OpenAlex图谱')).toBeTruthy();
  });
});
