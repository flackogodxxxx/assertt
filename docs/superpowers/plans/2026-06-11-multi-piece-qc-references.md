# Multi-piece Demands and QC References Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make multi-video scope explicit throughout the CRM and add precise video annotations with image references.

**Architecture:** Extend the existing demand/checklist contract instead of creating parallel task rows. Store reference files in a private Supabase Storage bucket and persist only their metadata in checklist comments. Keep media timing logic in pure helpers so it is testable independently from React.

**Tech Stack:** React 19, TypeScript, Vitest, Supabase Postgres/Storage/Realtime, Vite, Vercel.

---

### Task 1: Scope and timing contracts

**Files:**
- Create: `src/lib/demand-scope.ts`
- Create: `src/lib/media-review.ts`
- Create: `tests/demand-scope.test.ts`
- Create: `tests/media-review.test.ts`

- [ ] Write failing tests for count clamping, item normalization, scope labels, time parsing, seeking clamps, and correction ranges.
- [ ] Run `npx vitest run tests/demand-scope.test.ts tests/media-review.test.ts` and confirm missing exports fail.
- [ ] Implement the minimal pure functions.
- [ ] Re-run the focused tests and confirm they pass.

### Task 2: Demand persistence contract

**Files:**
- Modify: `src/contexts/DemandContext.tsx`
- Modify: `src/lib/crm-mappers.ts`
- Modify: `tests/crm-mappers.test.ts`

- [ ] Add failing mapper tests for `pieceCount`, `pieceInstructions`, `endTimestamp`, and `referenceImages`.
- [ ] Extend `Demand`, `Comment`, mapper reads/writes, updates, and notification copy.
- [ ] Run mapper and lifecycle tests.

### Task 3: Secure QC reference storage

**Files:**
- Create: `supabase/migrations/202606110003_qc_reference_storage.sql`
- Create: `src/lib/qc-reference-storage.ts`
- Create: `tests/qc-reference-storage.test.ts`

- [ ] Test deterministic safe paths and supported image validation.
- [ ] Add private `qc-references` bucket and authenticated object policies; restrict delete to Admin.
- [ ] Implement upload and signed URL helpers using the existing authenticated Supabase client.
- [ ] Apply the migration and verify upload, signed read, and policy behavior.

### Task 4: Multi-piece demand UX

**Files:**
- Modify: `src/pages/Demandas.tsx`
- Modify: `src/pages/ClientProfile.tsx`

- [ ] Add quantity and one-instruction-per-line inputs to new-demand form.
- [ ] Show a visible scope badge and numbered production list in cards/details/history.
- [ ] Include scope in assignment and review submission copy.
- [ ] Add accessibility assertions for labels and counts.

### Task 5: Precise QC player and attachments

**Files:**
- Modify: `src/components/VideoReviewPlayer.tsx`
- Modify: `src/components/DemandReviewWorkspace.tsx`
- Modify: `src/pages/Demandas.tsx`
- Modify: `tests/accessibility.test.tsx`

- [ ] Add seek range, play/pause, ±5 seconds, ±1 frame, speed, current/duration display, and keyboard controls.
- [ ] Add in/out markers and persist point/range comments.
- [ ] Add image picker, preview/removal, upload state, and image gallery on saved corrections.
- [ ] Ensure clicking a correction seeks precisely and remains paused.
- [ ] Run focused component/accessibility tests.

### Task 6: Verification and release

**Files:**
- Modify only if verification finds a defect.

- [ ] Run `npm run verify`.
- [ ] Verify desktop and 390 px mobile layouts in the browser.
- [ ] Run Supabase security/performance advisors.
- [ ] Deploy production to Vercel.
- [ ] Smoke-test login, demand scope, QC controls, client archive, and runtime logs on `https://assertt.vercel.app`.
