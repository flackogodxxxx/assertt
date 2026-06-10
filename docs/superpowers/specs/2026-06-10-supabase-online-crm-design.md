# Supabase Online CRM Design

## Goal

Move the Assert CRM from a localStorage prototype to an online Supabase-backed app while preserving the existing landing page and CRM experience.

## Architecture

The frontend remains React, Vite, TypeScript, React Router, Tailwind CSS, and the existing context-based structure. Supabase becomes the system of record for authentication, team profiles, client/task data, notifications, status, and attachments. The app uses the existing Supabase project `knmaekgzppmaclkesxfs` and its existing public tables: `profiles`, `clients`, `team_members`, `production_tasks`, `notifications`, and `demand_attachments`.

## Auth And Profiles

Login uses Supabase Auth email/password instead of a hardcoded password. The `profiles` table maps `auth.users.id` to the existing CRM roles: `Admin`, `Organizador`, `Video Maker`, and `Designer`. The frontend keeps the `useAuth` interface so existing pages can migrate with minimal churn, but the provider reads and writes profile state through Supabase.

## Demands And Notifications

Demands map to `production_tasks`. The UI-facing `Demand` model stays in Portuguese (`A Fazer`, `Em Andamento`, `Em Revisão`, `Concluído`, `Arte`, `Vídeo`, `Ambos`) and a repository layer translates to/from Supabase rows. Creating a demand inserts a task and creates notification rows for assigned users. Status changes and comments are persisted online; existing local-only comments become task metadata until a dedicated comments table is added.

## Realtime

The app subscribes to Supabase Realtime Postgres changes for `production_tasks`, `notifications`, and `demand_attachments`. Online user presence uses a Realtime presence channel with each user's id, name, role, avatar, and selected status. Persisted status is saved in `profiles.status`; current online/offline state comes from presence.

## Security

Only publishable Supabase keys are used in browser code. RLS stays enabled on exposed public tables. The immediate implementation uses the existing authenticated policies, then tightens visibility in frontend logic; database RLS can be tightened further once the first online flow is stable.

## Repository Hygiene

Tracked Chrome profiles and diagnostics are removed from git tracking and ignored. The files remain on disk for local inspection, but they no longer belong in commits.

## Verification

The project must pass `npm.cmd run verify`. Supabase changes are verified by listing tables/policies, checking realtime publication membership, and running Supabase advisors after schema changes.
