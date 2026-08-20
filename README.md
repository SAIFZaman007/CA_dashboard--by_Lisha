# Coach Auto — Admin Dashboard

The coach-facing console for **Autonomy Health and Fitness**. Deployed
separately from the client portal, on its own subdomain, as its own Coolify
service.

React 19 · Vite 8 · Tailwind 4 · TanStack Query · nginx

---

## What it does

| Screen | What it is for |
| --- | --- |
| **Overview** | Active clients, unread messages, new enquiries, session and sign-up trends, and a **needs attention** list of clients who have gone quiet. |
| **Clients** | The roster. Search, filter, and open one person's whole record: profile and targets, training, nutrition, check-ins, messages. |
| **Messages** | Every client conversation in one inbox. Opening a thread marks it read. |
| **Enquiries** | The website's "start your transformation" form, with a status pipeline. |
| **Consultations** | Discovery calls booked from the site, with private notes. |
| **Video Tutorials** | Post, edit, publish and delete the recordings clients watch in their portal. |
| **Exercise Library** | The shared movement catalogue every training plan draws from. |
| **Pricing Plans** | Create, edit, reorder, archive and delete the coaching tiers on the public site. |

### Who can do what

Two roles reach this app. A **client** account is refused at sign-in rather
than shown a shell it cannot use.

- **`coach`** — day-to-day work: read every client record, write training and
  meal plans, manage tutorials and the exercise library, reply to messages,
  work the enquiry and booking lists.
- **`admin`** — all of the above, plus: open and close client accounts, change
  someone's role, force a password reset, erase a record, and create, edit or
  delete pricing plans.

The split is enforced server-side (`CurrentCoach` / `CurrentAdmin`), not just
hidden in the UI.

---

## Local development

```bash
cd dashboard
cp .env.example .env      # leave VITE_API_URL blank
npm install
npm run dev               # http://localhost:5174
```

Port 5174, so the dashboard and the client portal (5173) run side by side. In
development Vite proxies `/api` to `http://localhost:8000`, so the backend needs
to be running.

```bash
npm run build     # production bundle into dist/
npm run lint      # must pass with zero warnings
npm run format    # prettier
```

### Before the first run

Copy two logo files across from the client portal — they are not duplicated in
git on purpose, but the app expects them at these paths:

```bash
mkdir -p public/images
cp ../frontend/public/images/logo-lockup-light.png public/images/
cp ../frontend/public/images/logo-mark-light.png   public/images/
```

Use the **`-light`** artwork. The dashboard is dark end to end; the `-dark`
files render black on black and look like a missing image.

---

## Deploying to Coolify

Create a **third** service alongside `api` and `web`.

| Setting | Value |
| --- | --- |
| Build pack | Dockerfile |
| Base directory | `/dashboard` |
| Dockerfile location | `/dashboard/Dockerfile` |
| Port | `8080` |
| Health check | `/health` |
| Domain | `coach.autonomyfitness.press` |

### Build variables

Vite inlines `VITE_*` **at build time**. Set these as *build* variables, not
runtime variables — changing them requires a rebuild, not a restart.

```
VITE_API_URL=
VITE_DASHBOARD_URL=https://coach.autonomyfitness.press
VITE_PORTAL_URL=https://autonomyfitness.press
VITE_ENVIRONMENT=production
```

### Leave `VITE_API_URL` blank — this is the important one

The bundled nginx proxies `/api` to the backend, so the dashboard and the API
answer on **one origin**.

That matters more here than anywhere else in this project. The refresh token is
an `HttpOnly` cookie scoped to `path=/api/v1/auth`. Same-origin keeps it
first-party: no `SameSite=None`, no CORS preflight, and no silent cookie drops
in Safari or behind a privacy extension. Point the browser straight at a
separate API domain and sign-in will appear to work, then drop the session on
the next page load — a failure that is genuinely unpleasant to debug.

If you deliberately want a cross-origin dashboard, the **backend** also needs:

```
CORS_ORIGINS=…,https://coach.autonomyfitness.press
COOKIE_SAMESITE=none
COOKIE_SECURE=true
COOKIE_DOMAIN=.autonomyfitness.press
```

The nginx `proxy_pass` upstream is `http://api:8000`. If the backend service has
a different name on your Coolify network, change that one line in `nginx.conf`.

### Set `VITE_ENVIRONMENT=staging` on preview deploys

A staging build shows an amber environment badge in the sidebar. Without it,
staging and production are visually identical — and both are pointed at real
client records unless you have given staging its own database.

---

## Security posture

- Access tokens live **in memory only**. Nothing about a coach's session
  touches `localStorage`, so an XSS bug cannot walk away with credentials that
  read every client record in the system.
- A single shared refresh promise: a screen firing six queries at once triggers
  one token rotation, not six that invalidate each other.
- `noindex, nofollow` on the page and as an `X-Robots-Tag` header.
- CSP allows video embeds from YouTube and Vimeo, thumbnails from their CDNs,
  and nothing else. `frame-ancestors 'none'`.
- Check-in photos are streamed through an authenticated route
  (`/admin/clients/{id}/photos/{id}/file`) and are never static assets.
- Destructive actions sit behind a confirm dialog; erasing a client or deleting
  a pricing plan requires typing the name to confirm.

---

## Backend requirements

This app talks to endpoints added in the same change set. The API must include:

- `app/models/media.py` and the `video_tutorials` table
- `app/api/v1/endpoints/admin/` (overview, clients, programming, catalog, inbox)
- `app/api/v1/endpoints/tutorials.py` for the client portal
- `CurrentAdmin` in `app/core/deps.py`

Run the migration before deploying:

```bash
cd backend && alembic upgrade head
```

Then make sure the coach account has the right role:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'coachauto2026@gmail.com';
```

Postgres stores these enums by **name**, so the value is `ADMIN`, not `admin`.

---

## Design notes

The palette, fonts and radii are copied verbatim from
`frontend/src/index.css`. Two drifting sets of tokens is exactly the cost the
project brief warned about, so the brand is shared and only the *register*
differs: smaller type, tabular numerals everywhere, darker surfaces, denser
tables — a console someone works in all afternoon rather than a page a client
visits for ten minutes.

The one flourish is the **status rail**: a 3px bar down the left edge of each
client row, coloured by how long since that person last checked in — green
within a week, amber within two, red beyond that, grey for never. A coach scans
forty rows looking for the four that need them, and colour does that faster
than a date column. Because it is a border rather than a background it survives
hover, selection and print. Colour is never the only signal: every row carries
the same status as text.