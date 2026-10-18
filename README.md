# Amates Solutions — Solar Site + Automation Backoffice

High-resilience solar hybrid systems for Palawan, Philippines. A single-page marketing site plus a
full admin backoffice (Leads CRM, booking calendar with crew dispatch, 24/7 monitoring cards and a
backend-only OpenRouter AI agent that writes grounded proposals with ROI).

Stack: **Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Drizzle ORM · Neon Postgres**.

---

## Tech stack

| Layer | Choice |
| :--- | :--- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5.9 |
| UI | React 19 · Tailwind CSS v4 · Lucide icons · Simple Icons brand marks |
| Database | PostgreSQL (Neon) via Drizzle ORM 0.45 |
| AI | OpenRouter, backend-only — with a deterministic ROI engine as fallback |
| Scheduling | Vercel Cron (`0 * * * *`) |
| Messaging | WhatsApp Cloud API webhook |
| Deploy | Vercel (`vercel.json`) |

## Project structure

```
src/
├── app/
│   ├── page.tsx              # marketing homepage
│   ├── services/             # full service catalogue
│   ├── blog/                 # public blog — list + [slug]
│   ├── admin/                # authenticated backoffice
│   │   ├── login/            # passkey → signed session cookie
│   │   └── (panel)/          # dashboard, leads, calendar, monitoring,
│   │                         #   settings, automations, blog, editor
│   └── api/                  # route handlers
│       ├── leads/            # public intake + admin CRM
│       ├── quote/generate/   # AI proposal + ROI
│       ├── appointments/     # booking calendar + crew dispatch
│       ├── webhook/whatsapp/ # Meta Cloud API inbound
│       └── cron/sweep/       # hourly fleet + SLA sweep
├── components/
│   ├── site/                 # public UI
│   └── admin/                # backoffice UI
├── db/
│   ├── schema.ts             # Drizzle schema — 12 tables
│   └── index.ts              # pooled pg client
└── lib/                      # domain logic
    ├── agent.ts              # LLM pass + deterministic ROI engine
    ├── automation.ts         # 7 automation rules
    ├── auth.ts               # passkey + signed sessions
    ├── roi.ts                # client-safe ROI maths
    ├── knowledge.ts          # grounded prompt context
    └── seed.ts               # demo data — development only
drizzle.config.json
vercel.json
.env.example                  # every variable documented, no secrets committed
```

## Languages

```
TypeScript  ████████████████████████████████  98.8%
CSS         ██                                 1.1%
```

---

## 1. Quick start

```bash
cp .env.example .env     # then fill in DATABASE_URL + OPENROUTER_API_KEY
npm install
npx drizzle-kit push     # creates users, leads, proposals, appointments, systems, settings
npm run dev              # http://localhost:3000
```

Open `/admin` and enter the passkey from `.env` (`ADMIN_PASSKEY`, default **`5309`**). The
backoffice seeds itself with demo leads, bookings and monitored systems on first load.

> **Locked out?** Five wrong tries lock the screen for 15 minutes. Clear it with:
> `psql $DATABASE_URL -c "delete from settings where key='admin_passkey_security';"`

## 2. Neon Postgres

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string and put it in `.env`:

```env
DATABASE_URL=postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/amates?sslmode=require
```

3. Push the schema:

```bash
npx drizzle-kit push
```

`src/db/index.ts` creates a single pooled `pg` client and wraps it with Drizzle;
`src/lib/neon.ts` re-exports it (server-only) and exposes a masked `describeDatabase()` helper for
the admin UI. **Every query uses Drizzle's query builder, which emits parameterized SQL** — no
string interpolation anywhere.

### Tables

| Table          | Purpose |
| -------------- | ------- |
| `users`        | Admin/staff accounts (scrypt password hashes) |
| `leads`        | Unified intake: `property_type`, `location`, `energy_usage_kwh`, `grid_state`, `contact_whatsapp`, `source_channel`, `status` |
| `proposals`    | AI proposals + ROI JSON per lead |
| `appointments` | Audit / install / maintenance bookings + crew dispatch |
| `systems`      | Commissioned systems that drive the monitoring cards |
| `settings`      | Key/value app config (OpenRouter model selectors, cached catalogue, site theme, site content) |
| `media_assets`  | Uploaded + remote images; bytes stored as base64 so they survive rebuilds |
| `nav_items`     | Header and footer navigation entries |
| `social_links`  | Social profiles with their icon choice and header/footer placement |
| `blog_posts`    | Blog articles (draft/published, cover image, tags, SEO) |
| `automation_rules` | Owner-configurable automation switches |
| `automation_log` | Append-only audit trail of automated actions |

## 3. Environment variables (`.env` only)

| Key | Required | Notes |
| --- | -------- | ----- |
| `DATABASE_URL` | yes | Neon Postgres connection string |
| `OPENROUTER_API_KEY` | no* | **Backend only.** Without it the agent uses the deterministic ROI engine |
| `OPENROUTER_SITE_URL` / `OPENROUTER_SITE_NAME` | no | Sent as OpenRouter attribution headers |
| `ADMIN_PASSKEY` | no | Backoffice passkey (default `5309`). **Build phase only** — see Security notes |
| `ADMIN_COOKIE_SECURE` | no | Force the `Secure` flag on the session cookie. Defaults to `true` only when the app is served over HTTPS |
| `ADMIN_SESSION_SECRET` | recommended | HMAC secret for the signed session cookie |
| `AGENT_API_KEY` | no | Allows `x-api-key` machine access to `POST /api/quote/generate` |
| `WHATSAPP_VERIFY_TOKEN` | no | Meta webhook verification handshake |
| `CREW_DISPATCH_WEBHOOK_URL` | no | POSTed when a booking is dispatched |
| `CRON_SECRET` | yes | Bearer token protecting `POST /api/cron/sweep`. Vercel Cron sends it automatically when the variable is set; without it the endpoint is unauthenticated. |

`.env`, `.next`, and `node_modules` are git-ignored. No variable is prefixed with `NEXT_PUBLIC_`,
so **no secret can reach the browser bundle**.

## 4. Site sections (`/`)

Hero (solar imagery + Palawan sub-cities) → Why Amates → 4-step framework → Verticals →
Project Review (Island Resort Linapacan, 7.3 kW, Ruby W. quote) → Quote form → Footer with the
full warranty/monitoring terms.

A dedicated **`/services`** page carries the full service catalogue:

* **Hero** with solar imagery and the "Whether you're powering your home or scaling operations…"
  positioning line.
* **Five-stage delivery strip** — Consultation → Delivery → Installation → Activation →
  Support 24/7.
* **"We install only the systems we use ourselves"** trust block (Deye / Jinko copy).
* **Four detailed service cards** — Residential, Commercial, Industrial & Marine, Maintenance &
  Monitoring — each with its full bullet list (energy usage assessment, roof compatibility
  evaluation, inverter and battery integration, full installation & activation, monitoring system
  setup, and so on).

The homepage Verticals section shows a trimmed summary of the same four and links through to the
full page.

### Logo

`src/components/site/Logo.tsx` renders the official lockup: a black rounded square carrying a white
peak (Λ) — the "A" of Amates as a geometric energy peak — followed by the wordmark. It is used in
the site header, footer, admin sidebar and login screen so the mark is identical everywhere.

## 5. Intake pipeline

Hero (solar imagery + Palawan sub-cities) → Why Amates → 4-step framework → Verticals →
Project Review (Island Resort Linapacan, 7.3 kW, Ruby W. quote) → Quote form → Footer with the
full warranty/monitoring terms.

### The 4-step framework

1. **Energy Audit** — sizing from your real load profile.
2. **Marine-Grade Technical Design** — hardware built for salt, heat and vibration.
3. **Efficient Installation** — crews that hit island deadlines and industrial safety standards.
4. **Activation & Monitoring** — testing, handover, troubleshooting manual and **free lifetime
   remote monitoring**.

> Free lifetime remote monitoring is available on systems installed by Amates, **requires a
> functional WIFI connection**, allows **no modifications except by Amates Solutions**, and is
> subject to the lifespan of the appliances and manufacturer software.


Both channels write to the same `leads` table:

* **Web form** → `POST /api/leads`
* **WhatsApp** → `POST /api/webhook/whatsapp` (Meta Cloud API payload *or* `{ "from", "text" }`)

The webhook parser infers `property_type`, `location`, `grid_state` and kWh/₱ figures from free
text, then stores the raw payload in `raw_payload` for audit.

```bash
curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H 'Content-Type: application/json' \
  -d '{"from":"+639170001111","text":"Hi, I am Ana. Resort in El Nido, 1800 kwh, running on generator, need solar asap"}'
```

## 6. AI agent (backend only)

`src/lib/openrouter.ts` starts with `import "server-only"` — the build fails if a client component
ever imports it. `src/lib/agent.ts` combines:

* a **deterministic ROI engine** (system size, battery, CAPEX, monthly/annual savings, payback,
  25-year net benefit, CO₂) using Palawan grid/diesel tariffs, and
* an **LLM pass** grounded in the 4-step framework, verticals and warranty/monitoring T&Cs
  (`src/lib/knowledge.ts`).

If OpenRouter is unreachable the endpoint still returns a complete proposal from the deterministic
engine and flags `engine: "deterministic"`.

```bash
# Protected: session cookie, or x-api-key matching AGENT_API_KEY
curl -X POST http://localhost:3000/api/quote/generate \
  -H 'Content-Type: application/json' -H "x-api-key: $AGENT_API_KEY" \
  -d '{"leadId":1}'
```

## 7. Admin backoffice (`/admin`)

| Route | What it does |
| ----- | ------------ |
| `/admin/login` | Passkey entry → signed, HTTP-only session cookie |
| `/admin` | KPIs, latest leads, next bookings, fleet health, agent green light |
| `/admin/leads` | Leads CRM — filter by status/channel, live search, status updates, proposal preview, one-click AI proposal |
| `/admin/calendar` | Month calendar, create audit bookings, **Dispatch crew** hook |
| `/admin/monitoring` | Simulated 24/7 telemetry cards from the `systems` table (auto-refresh 20 s) |
| `/admin/settings` | OpenRouter config: masked key, free/paid model selectors, **Refresh Models**, green/red indicator |
| `/admin/automations` | Automation toggles, activity log, manual sweep |
| `/admin/blog`, `/admin/blog/new`, `/admin/blog/[id]` | Blog: list, create, edit, publish, delete |
| `/admin/editor` | Full site control: fonts, colours, copy, images, header/footer nav, social links |

## 8. Automation (what the site does for you)

The owner never has to chase an enquiry. Every new lead — from the web form **or** the WhatsApp
webhook — runs through an automation pipeline (`src/lib/automation.ts`) that fires *after* the HTTP
response is sent, so the form stays instant.

| Rule | Trigger | What it does |
| ---- | ------- | ------------ |
| `auto_reply` | intake | Queues an immediate acknowledgement to the lead |
| `auto_score` | intake | Scores the lead 0–100 (`hot`/`warm`/`cool`) from property type, grid state, usage and timeline |
| `auto_proposal` | intake | Runs the AI agent and stores the proposal + ROI — no button press |
| `auto_book_audit` | intake | Picks the next free weekday slot and books the site audit, moving the lead to `audit booked` |
| `auto_followup` | intake | Adds a follow-up task 3 days after the audit |
| `fleet_health_sweep` | hourly | Raises a maintenance job for any monitored site in `warning`/`offline` or without WIFI |
| `stale_lead_sweep` | hourly | Creates an SLA follow-up for leads untouched for 24 h |

Each rule is a toggle in **`/admin/automations`**, alongside a live activity log and a **Run sweep
now** button. Every action is written to `automation_log` so the owner can see exactly what the
system did.

```bash
# Manual sweep
curl -X POST http://localhost:3000/api/cron/sweep \
  -H "Authorization: Bearer $CRON_SECRET"
```

On Vercel, `vercel.json` schedules `0 * * * *` automatically; anywhere else point any external cron
at that URL.

### Live instant estimate on the public site

The quote form renders a **live estimate** (system size, battery, monthly saving, payback, 25-year
net benefit) as the visitor types, using the exact same ROI engine as the backend agent
(`src/lib/roi.ts` — client-safe, no secrets). WhatsApp enquiries get the same numbers in their
instant auto-reply, so prospects are pre-qualified before a human opens the CRM.

## 9. API reference

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| `GET` | `/api/health` | public | DB liveness probe |
| `POST` | `/api/leads` | public | Website intake |
| `GET` | `/api/leads?status=&channel=&q=` | admin | Filter/search leads |
| `GET/PATCH/DELETE` | `/api/leads/:id` | admin | Lead detail, status, notes |
| `POST` | `/api/quote/generate` | admin or `x-api-key` | AI proposal + ROI |
| `POST` | `/api/models/refresh` | admin | `{ status:"ok", green:true, models:[...] }` |
| `GET` | `/api/models/status` | admin | Green-light state + masked key |
| `GET/POST` | `/api/appointments` | admin | Booking calendar |
| `PATCH` | `/api/appointments/:id` | admin | Crew dispatch hook |
| `GET` | `/api/systems` | admin | Monitoring fleet + summary |
| `GET/PUT` | `/api/settings/openrouter` | admin | Model selectors |
| `GET/PUT/POST` | `/api/automations` | admin | List/toggle rules, run sweep |
| `GET/POST` | `/api/cron/sweep` | `CRON_SECRET` | Daily fleet + SLA sweep (06:00 Asia/Manila) |
| `GET/POST` | `/api/webhook/whatsapp` | public | Verification + inbound messages |

## 10. Icons

All product icons are Lucide (`lucide-react`), resolved through one registry so the site and the
admin editor share a vocabulary.

* `src/lib/icons.tsx` — `"use client"`. Exports the `ICONS` map and the `<Icon name="…" />`
  component.
* `src/lib/icon-names.ts` — **plain module** (no `"use client"`). Holds the name maps
  (`STEP_ICONS`, `REASON_ICON_CHOICES`, `VERTICAL_ICONS`).

> **Why the split?** Exports of a `"use client"` module reach a *server* component as
> client-reference proxies, so `STEP_ICONS[key]` evaluated server-side silently returns
> `undefined` and the icon falls back. Keep name lookups in plain modules and pass only strings
> across the client boundary.

Lucide 1.59 renamed a few icons (`Building2` renders as `lucide-building-complex`); the registry
absorbs that so stored names keep working.

## 11. Social icons

`src/lib/social.tsx` renders the owner's social links.

**Important:** Lucide removed every brand logo in v1.0, so there are no official Lucide
Facebook / Instagram / GitHub / YouTube glyphs to import — importing them simply fails to
compile. Instead the brand marks below are the **official brand SVG paths from
[Simple Icons](https://simpleicons.org)**, rendered as inline SVG:

| Platform | Source |
| --- | --- |
| Instagram, Facebook, GitHub, YouTube, TikTok, WhatsApp, Telegram, X | Simple Icons (official brand path) |
| LinkedIn, Website, Email, Phone, Blog/RSS, Other | Lucide generic glyph |

LinkedIn uses a glyph because LinkedIn asked to be removed from open icon sets. Add or edit
links in **`/admin/editor` → Social links**; the picker groups them into "Brand logos" and
"Generic", and each link can be placed in the header or the footer independently.

## 12. Security notes

* `OPENROUTER_API_KEY` is read with `process.env` inside `server-only` modules; the UI receives
  only `maskedApiKey()` (e.g. `sk-or-••••••••••••••1a2b`).
* Session cookies are `httpOnly`, `sameSite=lax`, `secure` in production, and HMAC-signed.
* Backoffice auth is a **passkey** (`ADMIN_PASSKEY`, default `5309`): constant-time comparison,
  and a 15-minute lockout after 5 wrong tries, persisted in `settings`.
  **This is a build-phase convenience, not production auth.** A 4-digit code is brute-forceable
  given enough time and no rate limiting at the edge. Before going live, replace
  `loginWithPasskey()` in `src/lib/auth.ts` with a real provider (or re-enable the `users`
  table, which still carries scrypt password hashing).
* All SQL goes through Drizzle (parameterized). No raw string SQL with user input.
* `.env`, `.env.local` and `.next` are listed in `.gitignore`.

## 13. Scripts

```bash
npm run dev        # development
npm run build      # production build
npm run start      # production server
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```
