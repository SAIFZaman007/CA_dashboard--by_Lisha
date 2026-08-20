# Coach Auto — Admin Dashboard

Not built yet. This folder is reserved for the coach-facing dashboard, which is
the third milestone.

## Why it is empty

The client portal and the marketing site come first. The dashboard is where
Coach Auto does the work the clients never see:

- Review each client's weekly check-in — weight, tape measurements, photos,
  sleep and cardio side by side.
- Write and assign training programmes and meal plans.
- Manage the exercise library, including pasting in the YouTube/Vimeo links for
  each movement.
- Move a client from Level 1 to Level 2 after assessment.
- Read and reply to client messages, and confirm consultation bookings.
- Work the enquiry list from the website's "start your transformation" form.

## The backend is already there

Every endpoint the dashboard needs exists and is role-guarded. A user with
`role = coach` or `role = admin` passes the `CurrentCoach` dependency; clients
get a 403. The exercise write endpoints (`POST/PATCH/DELETE /api/v1/exercises`)
are already coach-only and tested.

What still needs adding for the dashboard specifically:

- `GET /api/v1/coach/clients` — the roster with last check-in date.
- `GET /api/v1/coach/clients/{id}` — one client's full record.
- `POST /api/v1/coach/clients/{id}/plan` — assign a training block.
- `POST /api/v1/coach/clients/{id}/meal-plan` — assign a meal plan.
- `GET /api/v1/coach/leads` and `GET /api/v1/coach/bookings`.

## When you build it

Reuse the frontend: copy `frontend/src/components/ui`, `lib/api.js`,
`lib/utils.js` and `index.css` across so the two apps share one design system
and one API client. The alternative — a second, drifting set of buttons and
tokens — costs more later than the copy costs now.

Deploy it on a subdomain (`coach.autonomyfitness.press`) as a third Coolify
service pointing at this folder.