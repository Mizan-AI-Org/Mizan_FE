# Checklist Submission Workflow

This document describes the updated submission process and manager review flow.

## Removal of Video Attachments

- UI components no longer render video inputs or players.
- Evidence types are limited to `photo`, `note`, and `signature`.

## Task Completion and Locking

- A checklist can be submitted only when:
  - All steps have a response (YES/NO/NA).
  - Photo evidence is present for steps that require it.
  - At least one signature has been captured (global sign-off).
- After submission, the execution is locked from further edits.

## Notifications

- On submission, the app attempts to notify managers via a dedicated endpoint:
  - `POST /notifications/checklists/submission/` with execution details.
- If not available, a fallback announcement is created targeting the `MANAGER` role.

## Manager Review Dashboard

- New page at `/dashboard/reviews/checklists` for managers.
- Lists submitted checklists with filters and actions:
  - Approve or reject via `POST /checklists/executions/{id}/manager_review/`.
  - View detailed report (placeholder action).

## Error Handling

- Notification failures do not block submission; they are logged and the UI continues.
- Review actions display user-friendly errors and keep the list consistent via refetch.

## Tests

- Basic unit test ensures Submit button is disabled until requirements are met.