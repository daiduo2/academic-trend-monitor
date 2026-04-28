# GitHub Pages OpenAlex Frontend Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the unified four-page Academic Trend Monitor frontend to `daiduo2/academic-trend-monitor` GitHub Pages and refresh repository README documentation.

**Architecture:** Keep GitHub Pages on the existing GitHub Actions Pages pipeline, building `frontend/dist` from `main`. Replace dev-only OpenAlex bundle loading with static JSON fallback paths under `frontend/public/data/output/...`, copied from `data/output/...` during local and CI builds. Rewrite bilingual README files using the provided README and GitHub publishing norms.

**Tech Stack:** React 18, Vite, Vitest, GitHub Actions Pages, static JSON bundles.

---

### Task 1: Static OpenAlex bundle loading

**Files:**
- Modify: `frontend/src/utils/openAlexFullPaperLightPaperCloudBundle.js`
- Modify: `frontend/src/utils/openAlexFullPaperTopicPeakGlobeBundle.js`
- Modify: `frontend/src/hooks/useOpenAlexFullPaperLightPaperCloud.js`
- Modify: `frontend/src/hooks/useOpenAlexFullPaperTopicPeakGlobe.js`
- Test: `frontend/src/utils/__tests__/openAlexFullPaperLightPaperCloudBundle.test.js`
- Test: `frontend/src/utils/__tests__/openAlexFullPaperTopicPeakGlobeBundle.test.js`

- [ ] Add exported static bundle path builders for the two deployed OpenAlex visualizations.
- [ ] Update hooks to call `fetchJsonWithFallback` against static path first and dev bridge second.
- [ ] Keep endpoint bridge support for local Vite development.
- [ ] Update tests so they verify static Pages paths and dev bridge paths.

### Task 2: Pages data copy pipeline

**Files:**
- Modify: `Makefile`
- Modify: `.github/workflows/deploy.yml`
- Add/track: `data/output/openalex_full_paper_light_paper_cloud/.../light_paper_cloud_bundle.json`
- Add/track: `data/output/openalex_full_paper_topic_peak_globe/.../topic_peak_globe_bundle.json`

- [ ] Copy both OpenAlex bundle directories into `frontend/public/data/output/` before Vite build.
- [ ] Keep existing arXiv dashboard JSON copy behavior unchanged.
- [ ] Avoid committing generated `frontend/public/data/` because it remains ignored build input.

### Task 3: README refresh

**Files:**
- Modify: `README.md`
- Create: `README.en.md`

- [ ] Rewrite Chinese README with logo header, quick navigation, project intro, features, quick start, data pipeline, deployment, structure, docs, ecosystem, contribution, changelog, license.
- [ ] Add matching English README with equivalent structure and cross-link navigation.
- [ ] Keep commands concrete and aligned with current Makefile and frontend scripts.

### Task 4: Verification and deployment

**Files:**
- Verify only: frontend tests and production build output.

- [ ] Run focused Vitest tests for OpenAlex bundle loading and page rendering.
- [ ] Run `npm run build` in `frontend`.
- [ ] Confirm `frontend/dist/404.html` exists for SPA fallback.
- [ ] Commit deployment changes and push to `main` or merge through PR depending repository protection.
- [ ] Delete obsolete remote branches only after confirming `main`, `gh-pages`, and active work branches are not removed.
