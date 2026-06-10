# Supabase Online CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Assert CRM run online through Supabase Auth, Database, Storage, and Realtime.

**Architecture:** Keep the existing React context boundary, but replace localStorage persistence with repository functions backed by Supabase. Use the existing Supabase tables and add only the minimum SQL needed for missing fields/policies.

**Tech Stack:** React 19, Vite 7, TypeScript, React Router, Supabase JS v2, Supabase Postgres/RLS/Realtime/Storage, Vitest, Testing Library, jest-axe.

---

### Task 1: Baseline Fixes

**Files:**
- Modify: `tests/accessibility.test.tsx`
- Modify: `src/contexts/DemandContext.tsx`
- Modify: `src/pages/Demandas.tsx`
- Modify: `src/components/brand-icons.tsx`
- Modify: `.gitignore`

- [ ] Write or update failing tests for visibility and router rendering.
- [ ] Verify the failing tests fail for the known reasons.
- [ ] Fix router test harness, demand visibility, invalid hook usage, and hardcoded SVG colors.
- [ ] Remove `diagnostics/` from git tracking with `git rm --cached -r diagnostics`.
- [ ] Run `npm.cmd run verify`.

### Task 2: Supabase Foundation

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/supabase-types.ts`
- Create: `src/lib/crm-mappers.ts`
- Modify: `package.json`
- Create: `.env.example`

- [ ] Install `@supabase/supabase-js`.
- [ ] Add browser-safe Supabase env configuration using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Generate TypeScript database types from Supabase and commit them locally.
- [ ] Add pure mapper tests for CRM demand/status/type conversions.

### Task 3: Online Providers

**Files:**
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/contexts/DemandContext.tsx`
- Modify: `src/contexts/NotificationContext.tsx`
- Create: `src/contexts/PresenceContext.tsx`
- Modify: `src/main.tsx`

- [ ] Replace fake auth with Supabase Auth and `profiles`.
- [ ] Replace demand localStorage persistence with Supabase task reads/writes.
- [ ] Replace notification localStorage persistence with Supabase notification reads/writes.
- [ ] Add realtime subscriptions for tasks and notifications.
- [ ] Add presence tracking for online users and saved status updates.

### Task 4: Page Integration

**Files:**
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/Equipe.tsx`
- Modify: `src/pages/Settings.tsx`
- Modify: `src/layouts/CrmLayout.tsx`
- Modify: `src/pages/Demandas.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Clientes.tsx`
- Modify: `src/pages/ClientProfile.tsx`

- [ ] Update login to authenticate through Supabase.
- [ ] Update team online/status rendering to use presence and profile status.
- [ ] Update settings to save profile edits online.
- [ ] Keep existing UI workflows intact while changing persistence underneath.

### Task 5: Supabase Verification

**Files:**
- Modify only if advisors identify required fixes.

- [ ] Run Supabase security and performance advisors.
- [ ] Verify realtime publication covers online tables.
- [ ] Run `npm.cmd run verify`.
- [ ] Run a local production build and report any warnings that remain.
