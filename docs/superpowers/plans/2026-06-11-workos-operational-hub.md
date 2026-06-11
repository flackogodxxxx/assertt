# WORKOS Operational Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved WORKOS operational workflow, normalized demand data, realtime notifications, review workspace, client operations, team capacity, command palette, audit history, and production deployment without n8n, `client_ai_profiles`, or `ai_runs`.

**Architecture:** Keep `production_tasks` as the demand root and add normalized piece, submission, review, activity, preference, and automation tables. The React app keeps its existing contexts for compatibility while new feature repositories and focused components own normalized server data and realtime recovery. Supabase remains authoritative; local storage is only a degraded fallback.

**Tech Stack:** React 19, TypeScript, Vite, React Router 7, Supabase Postgres/Auth/Realtime/Presence/Storage, Vitest, Testing Library, Vercel.

---

## File Structure

- `supabase/migrations/202606110004_workos_operational_hub.sql`: normalized tables, constraints, RLS, audit/notification triggers, RPCs, realtime publication.
- `src/features/demands/workflow.ts`: canonical states, transitions, labels, blockers, SLA helpers.
- `src/features/demands/types.ts`: normalized domain types.
- `src/features/demands/repository.ts`: demand workspace reads and transactional RPC calls.
- `src/features/demands/useDemandWorkspace.ts`: route-level loading and realtime synchronization.
- `src/features/demands/DemandWorkspace.tsx`: dedicated `/crm/demandas/:id` page and tabs.
- `src/features/demands/DemandSummaryTab.tsx`: briefing, assignments, state changes, blocking.
- `src/features/demands/DemandPiecesTab.tsx`: piece progress and per-piece ownership.
- `src/features/demands/DemandDeliveriesTab.tsx`: versioned partial submissions.
- `src/features/demands/DemandQcTab.tsx`: piece/version review and correction resolution.
- `src/features/demands/DemandActivityTab.tsx`: audit timeline.
- `src/features/reviews/ReviewInbox.tsx`: Admin/Organizer review queue.
- `src/features/notifications/realtime.ts`: resilient channel lifecycle and synchronization.
- `src/features/notifications/preferences.ts`: local/default preference normalization.
- `src/features/notifications/NotificationStatus.tsx`: connection and desktop/sound controls.
- `src/features/command-palette/CommandPalette.tsx`: keyboard-first client/demand search.
- `src/features/capacity/capacity.ts`: workload calculation.
- `src/pages/Equipe.tsx`: real presence and capacity display.
- `src/pages/ClientProfile.tsx`: client operational hub.
- `src/pages/IaAssert.tsx`: query-string context prefill only; no new AI persistence.
- `public/sw.js`: desktop notification service worker.
- `src/main.tsx`: routes, lazy loading, service worker registration.
- `src/layouts/CrmLayout.tsx`: review navigation, notification status, command palette.
- `src/contexts/DemandContext.tsx`: compatibility mapping and normalized write delegation.
- `src/contexts/NotificationContext.tsx`: preferences, connection status, reconnect/sync.
- `src/contexts/PresenceContext.tsx`: real presence only.
- `src/lib/crm-mappers.ts`: canonical status and one-root-demand mapping.
- `src/lib/supabase-types.ts`: normalized table types.
- `tests/workflow.test.ts`: transitions, blocking, archive rules.
- `tests/capacity.test.ts`: real capacity classification.
- `tests/notification-preferences.test.ts`: preference defaults and filtering.
- `tests/command-palette.test.ts`: authorized search projection.
- `tests/workspace-mappers.test.ts`: normalized data mapping.
- `tests/accessibility.test.tsx`: route controls and review semantics.

## Task 1: Canonical Workflow Domain

- [ ] Add failing tests to `tests/workflow.test.ts` for allowed transitions, blocked reason, unblocking to the previous state, complete piece approval, and delivered archival.
- [ ] Run `npm.cmd run test:a11y -- tests/workflow.test.ts` and confirm failures are caused by the missing workflow module.
- [ ] Implement canonical statuses and pure guards in `src/features/demands/workflow.ts`.
- [ ] Extend demand types and mapper compatibility in `src/contexts/DemandContext.tsx` and `src/lib/crm-mappers.ts`.
- [ ] Fix the existing `Ambos` scope regression so `formatDemandScope(2, "Ambos")` returns `2 peças`.
- [ ] Run workflow, mapper, lifecycle, scope, and visibility tests.

## Task 2: Supabase Schema, RLS, Audit, And Server Transactions

- [ ] Create `supabase/migrations/202606110004_workos_operational_hub.sql`.
- [ ] Add columns to `production_tasks`: blocker fields, previous blocked state, stage timestamps, SLA deadline, archive metadata, and update constraints for canonical statuses.
- [ ] Create `demand_items`, `submissions`, `submission_items`, `review_comments`, `activity_events`, `notification_preferences`, and `automation_events`.
- [ ] Add indexes for task, client, status, assignee, reviewer, created time, and unresolved review lookups.
- [ ] Enable RLS and grant authenticated Data API access for every new table.
- [ ] Add policies based on `profiles.auth_user_id`, role, demand assignment, reviewer assignment, and notification ownership.
- [ ] Add transactional RPCs for workflow transition, reassignment, partial submission, review decision, correction resolution, and permanent archived deletion.
- [ ] Add triggers for append-only activity, assignment notifications, submission notifications, and realtime publication.
- [ ] Add idempotent deadline/SLA event generation using `automation_events`.
- [ ] Apply the migration to Supabase project `knmaekgzppmaclkesxfs` and verify migration history.

## Task 3: Typed Repository And Realtime Recovery

- [ ] Add failing mapper tests in `tests/workspace-mappers.test.ts` for pieces, submissions, comments, and activity ordering.
- [ ] Run the tests and confirm the missing repository/domain behavior.
- [ ] Add normalized table types to `src/lib/supabase-types.ts`.
- [ ] Implement `src/features/demands/types.ts` and `src/features/demands/repository.ts`.
- [ ] Implement `src/features/notifications/realtime.ts` with unique channels, connection states, retry backoff, focus/online synchronization, and visible-tab safety sync.
- [ ] Implement `src/features/demands/useDemandWorkspace.ts` subscribing to root, pieces, submissions, submission items, review comments, and activity changes.
- [ ] Update `DemandContext` to create one root row, normalized pieces, versioned submissions, and server-backed status transitions while preserving legacy fallback reads.
- [ ] Run focused repository and realtime tests.

## Task 4: Dedicated Demand Workspace

- [ ] Add route behavior tests for `/crm/demandas/:id` and tab semantics.
- [ ] Add `DemandWorkspace.tsx` with a compact header and Summary, Pieces, Deliveries, QC, and Activity tabs.
- [ ] Add Summary actions for allowed transitions, blocking with mandatory reason, unblocking, and reassignment with mandatory reason.
- [ ] Add Pieces controls for per-piece status, owner, approval, and required/optional scope.
- [ ] Add Deliveries controls for immutable versioned partial submissions with per-piece links.
- [ ] Add QC controls using the existing video review player, piece/version selectors, reference images, time ranges, open/resolved corrections, and per-piece approval.
- [ ] Add Activity timeline for transitions, assignment, blocker, delivery, review, SLA, archive, and delete events.
- [ ] Change Kanban cards and dashboard review links to navigate to the demand workspace.
- [ ] Run component and accessibility tests.

## Task 5: Review Inbox, Client Hub, Capacity, And IA Context

- [ ] Add failing tests for review queue grouping and capacity classification.
- [ ] Implement `/crm/revisoes` for Admin/Organizer with filters and direct QC links.
- [ ] Expand `ClientProfile.tsx` with active work, review queue, archived deliveries, activity, deadlines, team, and IA Assert contextual shortcut.
- [ ] Implement capacity from active pieces, estimated minutes/hours, deadline pressure, active demands, and adjustment cycles.
- [ ] Remove simulated team status and show offline when no Presence session exists.
- [ ] Add IA Assert query-string prefill for client/demand context without creating `client_ai_profiles` or `ai_runs`.
- [ ] Run focused review, capacity, client, and IA tests.

## Task 6: Notifications, Service Worker, And Command Palette

- [ ] Add failing tests for notification preference defaults, type filtering, deduplication, and authorized command search.
- [ ] Add `notification_preferences` loading/saving and expose desktop, sound, assignment, review, and deadline toggles.
- [ ] Add connection state to the notification center: connected, reconnecting, and offline.
- [ ] Add explicit permission/audio activation and a test-notification action.
- [ ] Add `public/sw.js`, register it, and route notification clicks to the related demand.
- [ ] Ensure realtime INSERT alerts create one toast, one sound, and one native notification per notification ID.
- [ ] Implement `CommandPalette.tsx` with `Ctrl+K`/`Cmd+K`, clients, active demands, archived demands, reviews, and role-authorized commands.
- [ ] Replace the current header search with the command palette while keeping a compact trigger.
- [ ] Run notification and command-palette tests.

## Task 7: Full Verification, Supabase Validation, And Vercel Release

- [ ] Run `npm.cmd run test:a11y` and resolve all failures.
- [ ] Run `npm.cmd run build` and resolve TypeScript/build failures.
- [ ] Run `npm.cmd run verify:aeo`.
- [ ] Review changed React files against React best practices and accessibility.
- [ ] Verify migration history and run Supabase schema/security checks available through the connected project.
- [ ] Start the local Vite server and verify desktop/mobile layouts, direct demand refresh, all tabs, command palette, notification controls, review inbox, and client hub in the in-app browser.
- [ ] Verify two authenticated sessions receive demand and notification changes without manual refresh when credentials permit.
- [ ] Deploy a Vercel preview, verify it, then publish production.
- [ ] Inspect the production deployment and report the production URL and any remaining operational limitation.

## Excluded Scope

- No n8n workflow, node, webhook, credential, or runtime dependency.
- No `client_ai_profiles` table or feature.
- No `ai_runs` table, prompt history, model cost, result persistence, or evaluation.
- No Web Push delivery after the browser is fully closed; desktop notifications work while the installed/browser app process can receive them.
