# Multi-piece demands and QC references

## Goal

Make the real production scope explicit when one demand represents multiple deliverables, and make video review precise enough for editors to act without ambiguity.

## Demand scope

- A demand has a `pieceCount` from 1 to 50.
- The sender may add one instruction per piece, represented as a numbered list.
- One operational demand remains one Kanban card and one approval lifecycle.
- Cards, notifications, task details, review workspace, and client history show the total scope prominently.
- When no itemized instructions are supplied, the total count is still authoritative.
- Existing demands default to one piece.

## QC workflow

- The reviewer can play/pause, scrub the timeline, jump backward or forward five seconds, and step approximately one frame at 30 fps.
- A correction can target a point or an in/out interval.
- Keyboard shortcuts are available while the player is focused: space, left/right arrows, and shift+left/right for frame steps.
- Clicking a correction seeks to its start time without auto-playing.
- The reviewer can attach reference images and add explanatory notes to the same correction.

## Storage and persistence

- Scope fields, comments, time ranges, and reference metadata remain in the existing `production_tasks.checklist` JSON to preserve compatibility.
- Image binaries are uploaded to a private Supabase Storage bucket named `qc-references`.
- Authenticated users can upload and read references. Deletion is restricted to Admin users.
- Signed URLs are generated for display; the database stores only bucket paths and file metadata.
- Local-only mode uses object URLs for the current session and keeps text/time annotations functional.

## UI

- The new-demand form uses a numeric stepper and a multiline item list.
- Demand cards show a compact scope badge such as `7 vídeos`.
- Details show a numbered production checklist.
- The QC sidebar separates timeline corrections from briefing/scope context.
- Image attachments render as small inspectable thumbnails with filename and removal before submission.

## Validation

- Unit tests cover scope normalization, checklist mapping, time parsing/clamping, and correction ranges.
- Accessibility tests cover labeled controls and the QC dialog.
- Browser verification covers desktop and 390 px mobile layouts.
- Supabase verification covers bucket policies, upload, signed URL creation, and persisted checklist data.
- Production verification covers login, demand display, archived history, and QC controls.
