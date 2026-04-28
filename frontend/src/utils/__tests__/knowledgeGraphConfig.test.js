import { describe, expect, it } from 'vitest';
import {
  getDefaultKnowledgeGraphPresetKey,
  getKnowledgeGraphPresets,
} from '../knowledgeGraphConfig';

describe('knowledgeGraphConfig', () => {
  it('uses demo as the default storytelling entry in baseline mode', () => {
    expect(getDefaultKnowledgeGraphPresetKey({ prPreviewEnabled: false })).toBe('demo');

    const presets = getKnowledgeGraphPresets({ prPreviewEnabled: false });
    expect(presets.map((preset) => preset.key)).toEqual(['demo', 'stable-baseline']);
    expect(presets[0].tag).toBe('推荐起点');
  });

  it('keeps preview opt-in while still defaulting to the demo storytelling entry', () => {
    expect(getDefaultKnowledgeGraphPresetKey({ prPreviewEnabled: true })).toBe('demo');

    const presets = getKnowledgeGraphPresets({ prPreviewEnabled: true });
    const previewPreset = presets.find((preset) => preset.key === 'research-preview');
    const baselinePreset = presets.find((preset) => preset.key === 'stable-baseline');

    expect(previewPreset).toMatchObject({
      tag: 'Preview only',
      filter: {
        subcategory: 'math.PR',
        confidence: ['inferred', 'data-derived'],
      },
    });
    expect(previewPreset.description).toContain('不是 confirmed baseline');
    expect(baselinePreset.description).toContain('默认 /knowledge-graph');
  });
});
