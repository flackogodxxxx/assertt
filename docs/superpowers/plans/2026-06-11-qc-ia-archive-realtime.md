# QC, IA, Archive and Realtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar revisao QC e IA Assert mais limpas, arquivamento automatico por conclusao, exclusao administrativa segura, notificacoes Supabase Realtime com som e deploy validado na Vercel.

**Architecture:** `DemandContext` continua como fonte de estado do CRM, mas passa a expor colecoes operacionais e arquivadas explicitamente e operacoes assincronas com resultado. A persistencia continua em `production_tasks`; `delivered` representa arquivo. `NotificationContext` processa inserts Realtime incrementalmente e delega deduplicacao/som a helpers puros testaveis. As telas QC, IA e perfil do cliente usam componentes focados para reduzir arquivos monoliticos.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Lucide, Vitest, Testing Library, Supabase Auth/Postgres/Realtime, Gemini API e Vercel.

---

### Task 1: Regras de demanda ativa, arquivada e exclusao

**Files:**
- Create: `src/lib/demand-lifecycle.ts`
- Create: `tests/demand-lifecycle.test.ts`
- Modify: `src/contexts/DemandContext.tsx`

- [ ] **Step 1: Write the failing lifecycle tests**

```ts
import { describe, expect, it } from "vitest";
import { canPermanentlyDeleteDemand, getArchivedDemands, getOperationalDemands } from "../src/lib/demand-lifecycle";

describe("demand lifecycle", () => {
  it("keeps concluded demands outside operational surfaces", () => {
    expect(getOperationalDemands([
      { id: "active", status: "Em Revisão" },
      { id: "done", status: "Concluído" }
    ] as any)).toEqual([{ id: "active", status: "Em Revisão" }]);
  });

  it("keeps concluded demands in the archive", () => {
    expect(getArchivedDemands([
      { id: "active", status: "A Fazer" },
      { id: "done", status: "Concluído" }
    ] as any)).toEqual([{ id: "done", status: "Concluído" }]);
  });

  it("allows permanent deletion only for admins and archived demands", () => {
    expect(canPermanentlyDeleteDemand({ role: "Admin" } as any, { status: "Concluído" } as any)).toBe(true);
    expect(canPermanentlyDeleteDemand({ role: "Organizador" } as any, { status: "Concluído" } as any)).toBe(false);
    expect(canPermanentlyDeleteDemand({ role: "Admin" } as any, { status: "A Fazer" } as any)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx.cmd vitest run tests\demand-lifecycle.test.ts --environment jsdom`

Expected: FAIL because `src/lib/demand-lifecycle.ts` does not exist.

- [ ] **Step 3: Implement pure lifecycle helpers**

Create helpers with these signatures:

```ts
export function isArchivedDemand(demand: Demand): boolean;
export function getOperationalDemands(demands: Demand[]): Demand[];
export function getArchivedDemands(demands: Demand[]): Demand[];
export function canPermanentlyDeleteDemand(user: User | null, demand: Demand): boolean;
```

Use only `demand.status === "Concluído"`.

- [ ] **Step 4: Expose lifecycle collections and async deletion**

Change `DemandContextType` to expose:

```ts
operationalDemands: Demand[];
archivedDemands: Demand[];
deleteDemandPermanently: (id: string) => Promise<boolean>;
```

`visibleDemands` must become the user-visible operational collection. Keep `demands` as the complete collection used by client history.

For remote deletion:

```ts
await db.from("notifications").delete().eq("task_id", id);
const { error } = await db.from("production_tasks").delete().eq("id", id);
```

Only remove local state after the database deletion succeeds. Reject when the current user/demand does not satisfy `canPermanentlyDeleteDemand`.

- [ ] **Step 5: Run lifecycle and existing demand tests**

Run: `npx.cmd vitest run tests\demand-lifecycle.test.ts tests\demand-visibility.test.ts --environment jsdom`

Expected: both files PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/demand-lifecycle.ts src/contexts/DemandContext.tsx tests/demand-lifecycle.test.ts
git commit -m "feat: archive completed demands safely"
```

### Task 2: Notificacoes Realtime incrementais com som

**Files:**
- Create: `src/lib/notification-realtime.ts`
- Create: `tests/notification-realtime.test.ts`
- Modify: `src/contexts/NotificationContext.tsx`
- Modify: `src/contexts/DemandContext.tsx`

- [ ] **Step 1: Write failing notification decision tests**

```ts
import { describe, expect, it } from "vitest";
import { shouldAlertForNotification } from "../src/lib/notification-realtime";

describe("realtime notification alerts", () => {
  const event = { id: "n1", readAt: null, targetUserId: "des-1" };

  it("alerts once for a new unread event targeted to the user", () => {
    expect(shouldAlertForNotification(event, "des-1", new Set())).toBe(true);
  });

  it("does not alert for another user, a read event, or a duplicate", () => {
    expect(shouldAlertForNotification(event, "des-2", new Set())).toBe(false);
    expect(shouldAlertForNotification({ ...event, readAt: "2026-06-11" }, "des-1", new Set())).toBe(false);
    expect(shouldAlertForNotification(event, "des-1", new Set(["n1"]))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx.cmd vitest run tests\notification-realtime.test.ts --environment jsdom`

Expected: FAIL because the helper is missing.

- [ ] **Step 3: Implement notification helpers**

Provide:

```ts
export function shouldAlertForNotification(
  event: { id: string; readAt?: string | null; targetUserId?: string | null },
  userId: string,
  alertedIds: Set<string>
): boolean;

export function playNotificationTone(audioContext?: AudioContext): Promise<boolean>;
```

Generate a short two-note tone with Web Audio API. Return `false` without throwing when audio is unavailable or blocked.

- [ ] **Step 4: Process Realtime INSERT directly**

In `NotificationContext`, subscribe to `event: "INSERT"` and, when `payload.new.target_user_id` matches the current profile:

1. map the row with `notificationRowToEvent`;
2. prepend only if the ID is not already present;
3. show a toast;
4. invoke the tone once;
5. add the ID to a `useRef<Set<string>>`.

The initial fetch must populate events without playing sound. Keep UPDATE handling for `read_at`, but do not replay alerts.

- [ ] **Step 5: Persist assignment notifications only after tasks exist**

In `DemandContext.addDemand`, stop publishing the assignment event before remote persistence when `remoteEnabled` is true. Insert `production_tasks`, then insert one `notifications` row per returned task. Keep the local event only as the development fallback.

- [ ] **Step 6: Run notification tests**

Run: `npx.cmd vitest run tests\notification-realtime.test.ts tests\automation-client.test.ts --environment jsdom`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/notification-realtime.ts src/contexts/NotificationContext.tsx src/contexts/DemandContext.tsx tests/notification-realtime.test.ts
git commit -m "feat: deliver realtime demand alerts with sound"
```

### Task 3: Supabase authorization and archive integrity

**Files:**
- Create: `supabase/migrations/202606110001_secure_notifications_and_archived_delete.sql`
- Modify: `src/lib/supabase-types.ts` only if generated interfaces need the RPC signature

- [ ] **Step 1: Inspect current changelog, policies and publication**

Check current Supabase changelog and documentation for Realtime Postgres Changes and RLS. Query:

```sql
select * from pg_publication_tables
where pubname = 'supabase_realtime'
and tablename in ('production_tasks', 'notifications');
```

Also list policies for `notifications`, `production_tasks` and `profiles`.

- [ ] **Step 2: Write migration SQL**

The migration must:

1. keep RLS enabled;
2. replace broad notification SELECT/UPDATE policies with policies that compare `target_user_id` to the profile linked to `auth.uid()`, while allowing global rows;
3. create a private/security-definer deletion function or exposed RPC with a fixed `search_path`;
4. verify the caller has a linked `profiles.role = 'Admin'`;
5. verify the task status is `delivered`;
6. delete related notifications and then the task;
7. revoke execution from `anon` and grant it to `authenticated`;
8. ensure both tables are in `supabase_realtime`.

- [ ] **Step 3: Apply and verify in Supabase**

Use the Supabase MCP SQL tool for iterative verification, then store the final SQL in the migration file. Test as authenticated Admin and confirm a non-Admin call is rejected.

- [ ] **Step 4: Update frontend deletion to call RPC**

Replace direct remote deletes with:

```ts
const { error } = await db.rpc("delete_archived_demand", { demand_id: id });
```

- [ ] **Step 5: Run Supabase advisors and smoke queries**

Expected: no new RLS/security errors; Realtime publication contains both tables.

- [ ] **Step 6: Commit**

```powershell
git add supabase/migrations/202606110001_secure_notifications_and_archived_delete.sql src/contexts/DemandContext.tsx src/lib/supabase-types.ts
git commit -m "feat: secure archived demand deletion"
```

### Task 4: QC workspace redesign

**Files:**
- Create: `src/components/DemandReviewWorkspace.tsx`
- Modify: `src/components/VideoReviewPlayer.tsx`
- Modify: `src/pages/Demandas.tsx`
- Modify: `tests/accessibility.test.tsx`

- [ ] **Step 1: Add a failing accessibility render test**

Render the review workspace with a review-stage video demand and assert:

```ts
expect(screen.getByRole("heading", { name: /revisao da entrega/i })).toBeTruthy();
expect(screen.getByRole("button", { name: /solicitar ajustes/i })).toBeTruthy();
expect(screen.getByRole("button", { name: /aprovar e arquivar/i })).toBeTruthy();
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx.cmd vitest run tests\accessibility.test.tsx --environment jsdom`

Expected: FAIL because the workspace does not exist.

- [ ] **Step 3: Build the workspace**

Create a focused component accepting:

```ts
interface DemandReviewWorkspaceProps {
  demand: Demand;
  canApprove: boolean;
  currentUser: User;
  onAddComment: (text: string, timestamp?: string) => void;
  onApprove: () => Promise<void> | void;
  onClose: () => void;
  onRequestChanges: () => Promise<void> | void;
}
```

Use a desktop `minmax(0,1.45fr) minmax(22rem,.85fr)` grid, stable media dimensions, a scrollable correction timeline, collapsible context and a sticky action footer. Disable “Solicitar ajustes” when no correction exists.

- [ ] **Step 4: Integrate into Demandas**

Replace the review-stage branch of the existing modal with `DemandReviewWorkspace`. Approval calls `updateDemandStatus(id, "Concluído")`; request changes calls `updateDemandStatus(id, "Em Andamento")`.

Remove permanent delete controls from Kanban cards and active-demand modal.

- [ ] **Step 5: Run tests**

Run: `npx.cmd vitest run tests\accessibility.test.tsx tests\demand-lifecycle.test.ts --environment jsdom`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/components/DemandReviewWorkspace.tsx src/components/VideoReviewPlayer.tsx src/pages/Demandas.tsx tests/accessibility.test.tsx
git commit -m "feat: redesign the qc review workspace"
```

### Task 5: Client archive and admin deletion UI

**Files:**
- Create: `src/components/ClientDemandHistory.tsx`
- Modify: `src/pages/ClientProfile.tsx`
- Modify: `tests/accessibility.test.tsx`

- [ ] **Step 1: Add failing archive UI tests**

Assert the client history renders `Ativas` and `Arquivadas`, defaults to active demands, and displays the permanent delete action only for an Admin viewing an archived demand.

- [ ] **Step 2: Run the test and verify RED**

Run: `npx.cmd vitest run tests\accessibility.test.tsx --environment jsdom`

Expected: FAIL on missing tabs/action.

- [ ] **Step 3: Implement client history**

`ClientDemandHistory` receives all client demands and provides:

- tabs with counts;
- search;
- type filter;
- expandable demand detail;
- delivery and source links;
- comment/correction history;
- Admin-only permanent deletion inside archived detail.

The confirmation dialog must require the exact demand title before enabling the destructive button.

- [ ] **Step 4: Integrate and verify**

`ClientProfile` remains responsible for client metadata and passes filtered-by-client demands to the component.

Run: `npx.cmd vitest run tests\accessibility.test.tsx tests\demand-lifecycle.test.ts --environment jsdom`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/ClientDemandHistory.tsx src/pages/ClientProfile.tsx tests/accessibility.test.tsx
git commit -m "feat: add archived client demand history"
```

### Task 6: IA Assert workspace redesign

**Files:**
- Create: `src/components/ia/IaUploadWorkspace.tsx`
- Create: `src/components/ia/IaResultWorkspace.tsx`
- Modify: `src/pages/IaAssert.tsx`
- Modify: `tests/accessibility.test.tsx`

- [ ] **Step 1: Add failing IA structure test**

Assert the page exposes a named mode control, upload region, file requirements and a status region for errors/loading.

- [ ] **Step 2: Run the test and verify RED**

Run: `npx.cmd vitest run tests\accessibility.test.tsx --environment jsdom`

Expected: FAIL on the new accessible labels.

- [ ] **Step 3: Extract upload and result components**

Keep API/prompt behavior in `IaAssert`. Move only presentation into focused components. Use a restrained two-column desktop workspace, segmented mode control, compact options panel, clear upload state and result sections with icon-only copy controls plus `title`/`aria-label`.

- [ ] **Step 4: Run IA and Gemini tests**

Run: `npx.cmd vitest run tests\accessibility.test.tsx tests\gemini-client.test.ts --environment jsdom`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/ia/IaUploadWorkspace.tsx src/components/ia/IaResultWorkspace.tsx src/pages/IaAssert.tsx tests/accessibility.test.tsx
git commit -m "feat: redesign the ia assert workspace"
```

### Task 7: Visual, Supabase and production verification

**Files:**
- Modify: `vercel.json` only if project inspection shows a routing/build mismatch
- Modify: `.env.example` only if an expected public variable is missing

- [ ] **Step 1: Run the complete local gate**

Run: `npm.cmd run verify`

Expected: build, all Vitest files and AEO checks PASS.

- [ ] **Step 2: Start the development server**

Run a hidden background process on an available port:

```powershell
Start-Process npm.cmd -ArgumentList @("run","dev","--","--port","4173") -WorkingDirectory $PWD -WindowStyle Hidden
```

- [ ] **Step 3: Validate with the in-app browser**

At desktop and mobile viewports:

- log in;
- inspect Kanban without concluded tasks;
- open QC and verify no overlap;
- inspect client Ativas/Arquivadas;
- inspect IA upload and result states;
- verify keyboard focus and text containment.

Capture screenshots for evidence.

- [ ] **Step 4: Run Supabase smoke**

With two authenticated test clients:

1. subscribe as an assignee to `notifications`;
2. create a task and its notification as Admin/Organizer;
3. assert the insert arrives without refresh;
4. mark the task delivered and assert it remains queryable;
5. call archived deletion as Admin and confirm cleanup;
6. create a disposable archived task and assert non-Admin deletion is rejected.

- [ ] **Step 5: Inspect Vercel project**

Using the Vercel connector:

- identify the project and production domain;
- verify framework/build/output settings;
- verify the latest production deployment;
- confirm required environment variable names exist for Production and Preview;
- inspect recent failed build/runtime logs.

Never print secret variable values.

- [ ] **Step 6: Deploy production**

Run the Vercel deployment tool from this linked workspace. Inspect build logs and wait for a READY production deployment.

- [ ] **Step 7: Verify the deployed application**

Open the production URL and repeat login, demand creation, Realtime notification, archive history and IA page smoke checks.

- [ ] **Step 8: Final commit if deployment config changed**

```powershell
git add vercel.json .env.example
git commit -m "chore: finalize production deployment config"
```
