# Evolution Graph Visualization - Frontend Fix Plan

> **Status**: Implementation Plan Complete | **Next Step**: Phase 1 Execution

---

## Executive Summary

This document outlines the fix plan for aligning the evolution graph visualization frontend with the design specification. Based on comprehensive code review, multiple CRITICAL components are missing and HIGH priority issues need resolution.

**Current State**: Timeline view partially functional, Network view missing, no error handling, design mismatches
**Target State**: Dual-view system (Timeline + Network) with full error handling and design compliance

---

## Critical Findings Summary

| Category | Count | Status |
|----------|-------|--------|
| Missing Components | 4 | NetworkView, ConfidenceSlider, TopicTooltip, ErrorBoundary |
| High Priority Issues | 3 | View switching broken, no localStorage, mock data |
| Design Mismatches | 5 | Colors, sizing, edge types |

---

## Phase Breakdown

### Phase 1: Core Missing Components (CRITICAL)
**Goal**: Make the system functional
**Estimated Time**: 4-6 hours
**Dependencies**: None

#### Task 1.1: Create ErrorBoundary Component
**File**: `frontend/src/components/evolution/ErrorBoundary.tsx`
**Purpose**: Render error handling wrapper

```typescript
interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}
```

**Requirements**:
- Catch React render errors at EvolutionGraphContainer level
- Display "可视化渲染出错" message
- Show stack trace in dev, generic message in prod
- Provide "重试" button to re-render
- Provide "返回默认视图" button to reset filters

#### Task 1.2: Create ConfidenceSlider Component
**File**: `frontend/src/components/evolution/ConfidenceSlider.tsx`
**Purpose**: Edge confidence threshold control

```typescript
interface ConfidenceSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;  // default: 0.6
  max?: number;  // default: 1.0
  step?: number; // default: 0.05
}
```

**Requirements**:
- Range: 0.6 to 1.0, step 0.05, default 0.8
- Label: "置信度筛选: {value}"
- Visual slider with current value display

#### Task 1.3: Create TopicTooltip Component
**File**: `frontend/src/components/evolution/TopicTooltip.tsx`
**Purpose**: Hover tooltip for topic details

```typescript
interface TopicTooltipProps {
  node: EvolutionNode | null;
  position: { x: number; y: number };
  visible: boolean;
}
```

**Requirements**:
- Display: Topic name (bold), Category, Mode (with color), Period, Paper count
- Use React Portal to avoid clipping
- Smooth show/hide transitions

#### Task 1.4: Create NetworkView Component
**File**: `frontend/src/components/evolution/NetworkView.tsx`
**Purpose**: vis-network based force-directed graph

```typescript
interface NetworkViewProps {
  period: string;
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  confidenceThreshold: number;
  selectedNode: EvolutionNode | null;
  onSelectNode: (node: EvolutionNode | null) => void;
}
```

**Requirements**:
- Use vis-network/standalone
- Single period view only
- Force-directed layout with physics
- Node clustering for >800 nodes
- Physics disabled for >800 nodes, use static hierarchical
- Color by TopicMode
- Size by paper_count (logarithmic)

---

### Phase 2: Integration & State Management (HIGH)
**Goal**: Connect components and add persistence
**Estimated Time**: 3-4 hours
**Dependencies**: Phase 1 complete

#### Task 2.1: Create useViewState Hook
**File**: `frontend/src/hooks/useViewState.ts`

```typescript
interface ViewState {
  viewMode: 'timeline' | 'network';
  confidenceThreshold: number;
  currentPeriod: string;
}

export function useViewState(periods: string[]) {
  // localStorage persistence for viewMode
  // State management for all view-related state
}
```

**Requirements**:
- Persist viewMode to localStorage
- Provide reset function
- Sync with URL params (optional)

#### Task 2.2: Update EvolutionGraphContainer
**File**: `frontend/src/components/evolution/EvolutionGraphContainer.tsx`

**Changes**:
- Wrap with ErrorBoundary
- Add confidenceThreshold state
- Add viewMode localStorage persistence
- Conditional rendering: TimelineCanvas vs NetworkView
- Update filteredEdges with confidence filtering

```typescript
// Edge filtering logic
const filteredEdges = useMemo(() => {
  if (!data) return [];
  const nodeIds = new Set(filteredNodes.map(n => n.id));
  return data.edges.filter(e => {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return false;
    // Always show continued edges
    if (e.type === 'continued') return true;
    // Filter diffused_to_neighbor by confidence
    return e.confidence >= confidenceThreshold;
  });
}, [data, filteredNodes, confidenceThreshold]);
```

#### Task 2.3: Update TimelineCanvas with Tooltip
**File**: `frontend/src/components/evolution/TimelineCanvas.tsx`

**Changes**:
- Add hover state management
- Integrate TopicTooltip component
- Pass hover events to parent for tooltip display

---

### Phase 3: Design Alignment (MEDIUM)
**Goal**: Match design specification exactly
**Estimated Time**: 2-3 hours
**Dependencies**: Phase 2 complete

#### Task 3.1: Fix Color Scheme
**File**: `frontend/src/utils/colorSchemes.ts`

**Changes**:
Update to match design specification:
```typescript
export const MODE_COLORS: Record<TopicMode, string> = {
  theory: '#4A90D9',   // Blue
  method: '#5CB85C',   // Green
  problem: '#F0AD4E',  // Orange
  hybrid: '#9B59B6'    // Purple
};
```

#### Task 3.2: Fix Edge Type Naming
**File**: `frontend/src/types/evolution.ts`

**Changes**:
```typescript
export type EdgeType = 'continued' | 'diffused_to_neighbor';
```

Update all references in TimelineCanvas.tsx

#### Task 3.3: Add Loading Skeleton
**File**: Create `frontend/src/components/evolution/LoadingSkeleton.tsx`

**Requirements**:
- Match layout structure (sidebar, canvas, right panel)
- Pulsing animation
- Replace simple spinner

#### Task 3.4: Fix RightPanel Mock Data
**File**: `frontend/src/components/evolution/RightPanel.tsx`

**Changes**:
- Remove hardcoded timelineEvents
- Derive from selectedNode or fetch from data
- Show real data or empty state

---

## Component Architecture

```
EvolutionPage
└── ErrorBoundary
    └── EvolutionGraphContainer
        ├── LeftSidebar
        │   ├── View Mode Tabs (Timeline/Network)
        │   └── Category Filter
        ├── Center Content
        │   ├── BreadcrumbNav
        │   ├── CanvasToolbar
        │   ├── ConfidenceSlider (new)
        │   └── View Switcher:
        │       ├── TimelineCanvas + TopicTooltip
        │       └── NetworkView (new)
        ├── TimelineSlider
        └── RightPanel
```

---

## Data Flow

```
useEvolutionData
    ↓
EvolutionGraphContainer (state management)
    ↓
├── LeftSidebar (category filter, view mode)
├── TimelineCanvas (nodes, edges, hover → tooltip)
├── NetworkView (period, nodes, edges)
└── RightPanel (selectedNode details)
```

---

## State Management

| State | Location | Persistence |
|-------|----------|-------------|
| viewMode | useViewState | localStorage |
| confidenceThreshold | useViewState | memory |
| selectedCategory | EvolutionGraphContainer | memory |
| selectedNode | EvolutionGraphContainer | memory |
| currentPeriod | useViewState | memory |
| hoveredNode | TimelineCanvas | memory |

---

## Testing Checklist

### Component Tests
- [ ] ErrorBoundary catches and displays errors
- [ ] ConfidenceSlider updates value correctly
- [ ] TopicTooltip shows/hides on hover
- [ ] NetworkView renders vis-network graph
- [ ] View mode switch works (Timeline ↔ Network)

### Integration Tests
- [ ] Confidence threshold filters edges correctly
- [ ] View mode persists to localStorage
- [ ] Category filter updates node display
- [ ] Error boundary resets on "retry" click

### Visual Tests
- [ ] Colors match design specification
- [ ] Node sizing uses logarithmic scale
- [ ] Loading skeleton displays correctly

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| vis-network performance with 1000+ nodes | High | Medium | Implement clustering, disable physics |
| localStorage SSR issues | Low | Low | Check typeof window !== 'undefined' |
| D3 tooltip positioning | Medium | Low | Use Portal, test edge cases |
| Edge type migration breaks existing | Medium | High | Update all references atomically |

---

## Dependencies to Install

```bash
cd frontend
npm install vis-network @types/vis-network
```

---

## File Creation/Modification List

### New Files (6)
1. `frontend/src/components/evolution/ErrorBoundary.tsx`
2. `frontend/src/components/evolution/ConfidenceSlider.tsx`
3. `frontend/src/components/evolution/TopicTooltip.tsx`
4. `frontend/src/components/evolution/NetworkView.tsx`
5. `frontend/src/components/evolution/LoadingSkeleton.tsx`
6. `frontend/src/hooks/useViewState.ts`

### Modified Files (6)
1. `frontend/src/components/evolution/EvolutionGraphContainer.tsx`
2. `frontend/src/components/evolution/TimelineCanvas.tsx`
3. `frontend/src/components/evolution/RightPanel.tsx`
4. `frontend/src/utils/colorSchemes.ts`
5. `frontend/src/types/evolution.ts`
6. `frontend/package.json` (add vis-network)

---

## Acceptance Criteria

- [x] Timeline view displays all nodes with correct mode colors
- [ ] Network view displays single-period cross-topic relationships
- [ ] Confidence slider controls cross-topic edge visibility
- [ ] View switcher remembers user preference in localStorage
- [ ] Tooltips show accurate topic information on hover
- [ ] Error boundary catches and handles render errors gracefully
- [ ] Loading skeleton displays during data fetch
- [ ] Colors match design specification exactly
- [ ] Edge types use 'diffused_to_neighbor' naming

---

## Next Actions

1. **Immediate**: Install vis-network dependency
2. **Phase 1 Start**: Create ErrorBoundary component
3. **Review Gate**: Code review after each component
4. **Phase 2 Start**: Only after Phase 1 components approved

---

*Plan created: 2026-03-17*
*Based on design doc: 2026-03-17-evolution-graph-visualization-design.md*
