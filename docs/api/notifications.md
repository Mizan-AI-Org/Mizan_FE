# Notifications API Updates

## Preferred Endpoint

- `POST /notifications/checklists/submission/`
  - Payload: `{ execution_id, title, message, submitter_id, submitter_name, channels }`
  - Channels may include `in_app`, `email`, `push`.

## Fallback Endpoint

- `POST /notifications/announcements/create/`
  - Sends a high-priority announcement to managers.
  - Fields used: `title`, `message`, `priority`, `recipients_roles=["MANAGER"]`.

## WebSocket Delivery

- Clients subscribed to `ws://.../ws/notifications/?token=...` receive real-time updates.