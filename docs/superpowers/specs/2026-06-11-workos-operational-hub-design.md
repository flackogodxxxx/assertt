# WORKOS Operational Hub

## Goal

Transform the current CRM into an operational workspace where the Kanban is a
quick overview and each demand has a complete, auditable workspace. The scope
includes demand details, review inbox, contextual AI, reliable realtime
notifications, team capacity, deadline alerts, archival, audit history, and a
global command palette.

This design preserves the existing React, Vite, TypeScript, Supabase, Gemini,
and Vercel stack. Supabase remains the system of record. n8n is explicitly
excluded from the architecture.

## Approved Scope

- Keep Kanban as a quick overview.
- Add a dedicated route at `/crm/demandas/:id`.
- Add demand tabs: Summary, Pieces, Deliveries, QC, and Activity.
- Add a notification center with connection status.
- Add a review inbox for Admin and Organizer roles.
- Make AI available inside demands and client profiles.
- Turn the client profile into an operational hub.
- Show real team capacity without simulated presence.
- Add a command palette for clients and demands.
- Notify assignees when a demand is assigned.
- Notify reviewers when a delivery is submitted.
- Add deadline alerts.
- Preserve approved demands through archival and audit history.

## Product Principles

1. Supabase is the only authoritative operational data source.
2. Realtime improves latency, but the UI must recover automatically after a
   connection failure.
3. AI suggests and structures work; it does not approve, archive, assign, or
   modify operational records without a user confirmation.
4. Every important transition must be auditable.
5. Kanban cards remain compact and never become the full editing interface.
6. Existing demands remain readable during and after schema migration.
7. Operational automation runs only through Supabase Database functions,
   triggers, Edge Functions, Cron, and Realtime.

## Canonical Workflow

The demand workflow is:

`Draft -> Planned -> In production -> In review -> Adjustments -> Approved -> Delivered/Archived`

The additional `Blocked` state can be entered from Planned, In production,
In review, or Adjustments.

### State Rules

- `Draft`: demand is being prepared and is not visible in operational queues.
- `Planned`: scope, owners, and due date are valid; work can start.
- `In production`: at least one assignee is actively producing.
- `In review`: at least one submission version is waiting for a reviewer.
- `Adjustments`: one or more pieces have unresolved corrections.
- `Approved`: every required piece is approved, but final delivery is not yet
  recorded.
- `Delivered/Archived`: final delivery is recorded and the demand leaves
  operational queues without being deleted.
- `Blocked`: work cannot proceed. A reason and actor are mandatory.

Every transition records its actor, previous state, next state, reason when
applicable, and timestamp in `activity_events`.

Unblocking restores the state that was active before the block. The unblock
event records its actor and reason, then resumes or restarts the stage SLA
according to the block category.

### Piece And Submission Rules

- Approval occurs individually per piece.
- A demand reaches Approved only when every required piece is approved.
- Each delivery creates an immutable submission version.
- Submission content and files are immutable after creation; review metadata
  is recorded separately for each submitted piece.
- A submission may include only part of the demand scope.
- Partial delivery never creates a duplicate demand.
- Corrections have `open` or `resolved` state.
- Resolving a correction records actor and timestamp.
- Reassignment records old owner, new owner, author, reason, and timestamp.
- Each workflow stage has an entry timestamp and an SLA target.
- Leaving and re-entering a stage creates a new SLA cycle without deleting
  previous cycles.

## Information Architecture

### Main Navigation

- Dashboard
- Reviews
- Clients
- Calendar
- Demands
- IA Assert
- Team
- Settings

The new Reviews entry is shown only to Admin and Organizer roles.

### Demand Routes

- `/crm/demandas`: operational Kanban and list filters.
- `/crm/demandas/:id`: dedicated demand workspace.
- `/crm/revisoes`: review inbox for management roles.

Opening a Kanban card navigates to the dedicated demand route. Quick actions
remain available on the card only when they do not require detailed context.

## Demand Workspace

The demand route uses a compact header followed by tabs. The route must remain
usable on desktop and mobile and must support direct links and browser refresh.

### Header

The header contains:

- Client name and logo.
- Demand title.
- Current stage and priority.
- Scope, such as `7 videos`.
- Assignees and reviewer.
- Due date and deadline risk.
- Realtime save state.
- Contextual actions allowed for the current role.

### Summary Tab

The Summary tab contains:

- Operational briefing.
- Objective and expected outcome.
- Dropbox, planning, and reference links.
- Current owners and reviewer.
- Due date, priority, channel, and demand type.
- Blocker or pending-information state.
- AI action to analyze and structure the briefing.

### Pieces Tab

The Pieces tab treats every expected deliverable as an explicit item:

- Position and label.
- Piece-specific instruction.
- Production state.
- Latest submission state.
- Approval state.
- Assigned specialist when different from the demand owner.

Existing demands without normalized items are represented by generated
read-only items based on `checklist.pieceCount` until migration completes.

### Deliveries Tab

The Deliveries tab contains immutable submission versions:

- Version number.
- Submitted pieces.
- General and piece-specific links.
- Description from the submitter.
- Submitter and timestamp.
- Review result.
- Stage SLA at the time of submission.

A new delivery creates a new version instead of overwriting the previous
delivery.

### QC Tab

The QC tab reuses the current video review controls and adds:

- Piece selector.
- Submission version selector.
- Pending and resolved corrections.
- Time point or in/out range.
- Reference images.
- Approval per piece.
- Open and resolved correction filters.
- Request-changes decision with a required reason or correction.
- Final approval only when all required pieces are approved.

### Activity Tab

The Activity tab is an immutable timeline containing:

- Demand creation.
- Assignment and reassignment.
- Reassignment reason and previous owner.
- Status changes.
- Block and unblock reasons.
- Deadline changes.
- Delivery submissions.
- Comments and corrections.
- Piece approvals.
- Adjustment requests.
- Archive events.
- SLA warnings and breaches.
- AI generations explicitly saved by a user.

The timeline displays actor, timestamp, event type, and a concise summary.

## Review Inbox

The review inbox is a dense work queue for Admin and Organizer roles.

### Queue Groups

- Waiting for first review.
- Adjustments resubmitted.
- Partially approved.
- At deadline risk.
- Waiting longer than the configured review SLA.
- Blocked demands that require management action.

### Item Content

- Client and demand.
- Submitted scope versus total scope.
- Version number.
- Submitter.
- Waiting time.
- Due date.
- Number of unresolved corrections.
- Primary action: open QC.

### Filters

- Reviewer.
- Client.
- Type.
- Waiting time.
- Deadline risk.
- Submission state.
- Open or resolved correction state.

## Client Operational Hub

The client profile becomes the central account workspace.

### Overview

- Active and archived demand counts.
- Current team.
- Review queue.
- Upcoming deadlines.
- Current production distribution.
- Average production and review time when sufficient history exists.

### Client Sections

- Active demands.
- Reviews.
- Archived deliveries.
- Activity history.
- AI profile.
- Operational links and references.

### Client AI Profile

The client AI profile stores editable, approved context:

- Audience.
- Tone of voice.
- Products and services.
- Preferred calls to action.
- Restricted words and claims.
- Brand differentiators.
- Approved examples.
- General content notes.

AI calls for that client receive this profile as trusted application context.
Media, briefs, and user-entered content remain untrusted data.

## Contextual AI

### Demand AI

Available actions:

- Structure an incomplete briefing.
- Find missing information.
- Generate a production checklist by piece.
- Produce caption variants from approved context.
- Summarize the latest corrections.
- Compare current and previous submission notes.

Generated content is shown as a draft. Saving it to the demand always requires
a user action.

### Client AI

Available actions:

- Generate copy using the client AI profile.
- Propose content angles.
- Summarize recent production history.
- Identify recurring correction themes.
- Prepare a reusable briefing from approved client context.

### AI Backend

Gemini calls move from the browser to a Supabase Edge Function:

- The Gemini API key is stored as an Edge Function secret.
- The function validates the Supabase JWT and user role.
- Input size and MIME type are validated.
- Requests use JSON Schema structured output.
- Each execution is logged in `ai_runs`.
- Prompts clearly separate trusted application instructions from untrusted
  user and media content.
- Rate limits are applied per user.

The exposed `VITE_GEMINI_API_KEY` is removed and the current key is rotated.

## Command Palette

The command palette opens with `Ctrl+K` or `Cmd+K`.

### Searchable Items

- Clients.
- Active demands.
- Archived demands.
- Review inbox items.

### Commands

- Open client.
- Open demand.
- Create demand for client, when authorized.
- Open review inbox.
- Open IA Assert.

Search initially uses a locally indexed projection of already authorized
Supabase rows. It must never expose records hidden by RLS.

## Team Capacity And Presence

Simulated status is removed.

### Presence

- Online means the user currently has an active Supabase Presence session.
- Offline means no active presence session.
- Manual work status remains separate: available, meeting, lunch, recording,
  focused, or unavailable.
- Last-seen time is displayed when offline.

### Capacity

Capacity is calculated from operational data rather than online status:

- Active piece count.
- Estimated hours.
- Due-date pressure.
- Number of demands in production.
- Number of adjustment cycles.

Each team member has a configurable weekly capacity. The UI shows:

- Available.
- Balanced.
- Near capacity.
- Over capacity.

Capacity is advisory. Assignment is never blocked automatically.

## Notifications And Connection State

### Notification Center

The notification center shows:

- Connected, reconnecting, or offline status.
- Unread events.
- Notification type.
- Related demand link.
- Timestamp.
- Mark-read and mark-all-read actions.
- Desktop notification and sound preferences.

### Realtime Reliability

- Channels use unique instance names.
- Subscription statuses are monitored.
- `CHANNEL_ERROR`, `TIMED_OUT`, and unexpected `CLOSED` states trigger
  exponential reconnection.
- Returning to the tab, regaining focus, or coming online triggers an
  immediate synchronization.
- A low-frequency visible-tab synchronization acts as a safety net.
- The UI never requires a manual page refresh to recover.

Supabase Broadcast with database triggers is the target architecture for
operational events. Existing Postgres Changes subscriptions may remain during
the first migration phase.

### Windows Notifications And Sound

- Permission is requested from an explicit user action.
- A service worker displays persistent desktop notifications.
- Audio is unlocked by the same user action and retained for future alerts.
- The app provides a test-notification action.
- A notification ID is alerted at most once per session.
- Read or historical notifications do not replay sound.
- If desktop permission is denied, in-app toast and unread counter continue.

The realtime browser experience works while the site is open or running in the
background. Receiving alerts after the browser is fully closed requires Web
Push and is outside this phase.

## Operational Notifications

### Demand Assigned

When a persisted demand or piece assignment is created:

- Create one notification per assignee.
- Include client, demand, scope, priority, and due date.
- Link directly to `/crm/demandas/:id`.
- Emit the notification only after the database transaction succeeds.

### Delivery Submitted

When a submission is created:

- Notify the assigned reviewer.
- Notify Admin and Organizer users according to review preferences.
- Include submitted pieces and version.
- Link directly to the QC tab for the submission.

### Deadline Alerts

Initial rules:

- Due in 48 hours.
- Due in 24 hours.
- Due today.
- Overdue.

Alerts are generated server-side using Supabase Cron and an idempotent event
key. A demand does not receive the same deadline alert twice.

### Stage SLA Alerts

Each stage has a configurable target duration. Supabase Cron evaluates active
stage cycles and creates idempotent alerts for:

- 75% of SLA consumed.
- SLA due.
- SLA breached.

Blocking pauses the active SLA clock only when the block category is configured
as an external dependency. The pause and resume events are audited.

## Archive And Audit

Approval and archival are separate recorded events:

- Final approval records the approving user and timestamp.
- Archival removes the demand from operational queues.
- Archived demands remain available in client history and command search.
- Permanent deletion remains restricted to Admin and requires an explicit
  confirmation.
- Deletion writes an audit record before dependent data is removed.

Audit events are append-only for normal users. Operational updates never edit
or delete past audit events.

## Data Model

### Existing Tables Retained

- `profiles`
- `clients`
- `production_tasks`
- `notifications`
- `demand_attachments`

### New Tables

#### `demand_items`

- `id uuid`
- `task_id text`
- `position integer`
- `title text`
- `item_type text`
- `instruction text`
- `is_required boolean`
- `estimated_minutes integer`
- `status text`
- `assignee_id text`
- `approved_at timestamptz`
- `approved_by text`

Unique constraint: `(task_id, position)`.

Piece status is restricted to `planned`, `production`, `review`,
`adjustments`, `approved`, or `delivered`.

#### `submissions`

- `id uuid`
- `task_id text`
- `version integer`
- `submitted_by text`
- `description text`
- `status text`
- `created_at timestamptz`

Unique constraint: `(task_id, version)`.

Submission status is restricted to `pending_review`, `changes_requested`,
`partially_approved`, or `approved`.

#### `submission_items`

- `id uuid`
- `submission_id uuid` referencing `submissions`
- `demand_item_id uuid`
- `url text`
- `media_type text`
- `review_status text`
- `reviewed_at timestamptz`
- `reviewed_by text`
- `created_at timestamptz`

Submission item review status is restricted to `pending`,
`changes_requested`, or `approved`.

#### `review_comments`

- `id uuid`
- `task_id text`
- `submission_id uuid`
- `demand_item_id uuid`
- `author_id text`
- `body text`
- `start_seconds numeric`
- `end_seconds numeric`
- `reference_attachments jsonb`
- `status text`
- `created_at timestamptz`
- `resolved_at timestamptz`
- `resolved_by text`

Correction status is restricted to `open` or `resolved`.

#### `activity_events`

- `id uuid`
- `task_id text`
- `client_id text`
- `actor_id text`
- `event_type text`
- `payload jsonb`
- `created_at timestamptz`

Important payloads include:

- Workflow transition: old state, new state, and reason.
- Reassignment: previous assignee, new assignee, and reason.
- Block: category, reason, whether SLA is paused.
- SLA event: stage, target, elapsed duration, and severity.

#### `client_ai_profiles`

- `client_id text`
- `audience text`
- `tone_of_voice text`
- `products jsonb`
- `preferred_ctas jsonb`
- `restricted_claims jsonb`
- `approved_examples jsonb`
- `notes text`
- `updated_by text`
- `updated_at timestamptz`

#### `ai_runs`

- `id uuid`
- `user_id text`
- `client_id text`
- `task_id text`
- `action text`
- `model text`
- `prompt_version text`
- `status text`
- `input_metadata jsonb`
- `output jsonb`
- `error text`
- `created_at timestamptz`

#### `notification_preferences`

- `user_id text`
- `desktop_enabled boolean`
- `sound_enabled boolean`
- `assignment_enabled boolean`
- `review_enabled boolean`
- `deadline_enabled boolean`
- `updated_at timestamptz`

#### `automation_events`

- `id uuid`
- `event_key text unique`
- `source text`
- `task_id text`
- `status text`
- `payload jsonb`
- `error text`
- `created_at timestamptz`
- `processed_at timestamptz`

These events are produced and consumed only by Supabase triggers, Edge
Functions, and Cron jobs. No n8n workflow or webhook is used.

### Additional `production_tasks` Fields

`production_tasks` remains the demand root and gains:

- `blocked_reason text`
- `blocked_category text`
- `blocked_from_status text`
- `blocked_at timestamptz`
- `blocked_by text`
- `stage_entered_at timestamptz`
- `stage_sla_due_at timestamptz`
- `archived_at timestamptz`
- `archived_by text`

The existing `status` column remains canonical. Its constraint accepts:

- `draft`
- `planned`
- `production`
- `review`
- `adjustments`
- `approved`
- `delivered`
- `blocked`

`delivered` and `archived_at` are written in the same transaction. During
migration, existing `todo` records map to `planned`; all other compatible
legacy states retain their closest workflow equivalent.

## Security

RLS must enforce the same access model as the UI:

- Admin and Organizer can view all operational demands.
- Designers and Video Makers can view demands assigned to them.
- Only Admin and Organizer can create assignments and review decisions.
- Assignees can submit deliveries and update allowed production fields.
- Blocking requires an allowed role, a non-empty reason, and an activity event.
- Reassignment requires Admin or Organizer role and a non-empty reason.
- Users can read only their own targeted notifications.
- Client AI profiles are readable by authorized team members and writable only
  by Admin and Organizer.
- AI execution rows are visible to the requester and Admin.
- Profiles are no longer publicly readable without authentication.

Role checks use the profile linked to `auth.uid()`. Browser code never receives
a secret or service-role key.

## Frontend Architecture

The current large files are divided along feature boundaries:

- `features/demands/repository`
- `features/demands/realtime`
- `features/demands/workspace`
- `features/reviews`
- `features/notifications`
- `features/command-palette`
- `features/capacity`
- `features/ai`

React contexts retain only session-wide concerns. Server data moves to focused
repositories and hooks. Route-level code splitting is added for CRM pages.

## Migration Strategy

### Phase 1: Reliability And Security

- Move Gemini behind an Edge Function and rotate the exposed key.
- Tighten RLS.
- Implement resilient realtime and notification permission controls.
- Remove simulated presence.
- Fix assignment persistence before notification creation.

### Phase 2: Demand Workspace

- Add route and tabs.
- Add activity timeline.
- Keep reading legacy checklist data.
- Make Kanban cards navigate to the workspace.
- Add command palette.

### Phase 3: Normalized Workflow

- Create `demand_items`, `submissions`, `submission_items`,
  `review_comments`, and `activity_events`.
- Backfill existing tasks.
- Write new operations to normalized tables.
- Preserve compatibility reads until verification completes.
- Introduce the canonical workflow, blocking, stage cycles, reassignment audit,
  and partial delivery rules.

### Phase 4: Reviews And Client Hub

- Add review inbox.
- Add piece and version-aware QC.
- Expand client profile into the operational hub.
- Add real capacity calculations.

### Phase 5: Contextual AI And Deadline Automation

- Add client AI profiles.
- Add demand/client AI actions.
- Add AI execution audit.
- Add idempotent deadline alerts.
- Complete archive and audit views.

## Error Handling

- Database writes display explicit pending, success, and failure states.
- Failed writes remain visible and retryable; the UI does not claim success.
- Realtime failure changes the connection indicator and starts recovery.
- AI failures never remove user input and expose a retry action.
- Partial migration failures fall back to legacy checklist reads.
- Deadline automation records failures in `automation_events`.

## Testing

### Unit

- Role-based visibility and actions.
- Capacity calculations.
- Deadline classification.
- Notification deduplication.
- Legacy checklist to normalized item mapping.
- AI prompt construction and output validation.

### Integration

- Assignment transaction creates task, items, activity, and notifications.
- Submission creates immutable version and reviewer notifications.
- Review comments do not overwrite concurrent comments.
- Open corrections can be resolved without deleting their history.
- Final approval is rejected until every required piece is approved.
- Final delivery sets `delivered` and archives the demand transactionally.
- Deadline jobs are idempotent.
- Stage SLA alerts are idempotent and preserve previous cycles.
- Blocking without a reason is rejected.
- Reassignment records the previous owner, new owner, author, and reason.
- RLS prevents unauthorized task access and updates.

### Browser

- Kanban to demand workspace navigation.
- Direct route refresh.
- All five demand tabs.
- Review inbox filtering and QC navigation.
- Command palette keyboard flow.
- Desktop notification permission and test action.
- Realtime update across two authenticated sessions without refresh.
- Desktop and mobile layouts without overlap.

## Acceptance Criteria

- Kanban remains compact and opens the dedicated demand workspace.
- `/crm/demandas/:id` survives direct navigation and browser refresh.
- Summary, Pieces, Deliveries, QC, and Activity tabs use persisted data.
- Admin and Organizer have a usable review inbox.
- Notifications display connection state and recover without manual refresh.
- Assignment and submission notifications arrive immediately.
- Deadline alerts are generated once per rule and demand.
- Client profiles show active work, reviews, archive, activity, and AI context.
- Team capacity uses real workload and presence contains no simulated users.
- `Ctrl+K` or `Cmd+K` locates authorized clients and demands.
- AI is available inside client and demand contexts without exposing its API
  key in the browser.
- Archived demands remain searchable and auditable.
- The canonical workflow supports Draft, Planned, In production, In review,
  Adjustments, Approved, Delivered/Archived, and Blocked.
- Partial submissions, individual piece approval, correction resolution,
  stage SLA, and reassignment history work without duplicating demands.
- Build, automated tests, Supabase RLS tests, two-session realtime tests, and
  production browser verification pass before release.
