# WebXstudio — website + CMS

The marketing site and client console for **WebXstudio**, a founder-led product studio in New Delhi.
It uses a dark "Noir & Champagne" design: gold `#d4ad66` on warm obsidian, set in Fraunces, Manrope and JetBrains Mono.
Every section of the site is served from a database and is editable in a role-based admin console.

- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS v4, Three.js (armillary hero scene, loaded on demand)
- **API (default):** Node.js + Express 5 + SQLite/libSQL (`@libsql/client` — a local file in development, a hosted [Turso](https://turso.tech) database in production), optional email via Nodemailer or the Brevo/Resend HTTP APIs
- **API (shared hosting):** PHP 8 + MySQL. It exposes the same contract, so the site and console work unchanged.

---

## Quick start

Requires **Node.js 20.12+**.

```bash
npm install
npm run dev      # API on :4000 + site on http://localhost:5173 (one command, Ctrl+C stops both)
```

The site reads everything from the API, so both have to be running. `npm run dev` starts them together;
if the API is already running in another terminal it starts only the web server. To run them apart:

```bash
npm run server   # API → http://localhost:4000/api/health
npm run dev:web  # site → http://localhost:5173  (proxies /api to :4000)
```

Open **http://localhost:5173/#/admin**. The first API start creates the owner account and prints its login once:

```
+----------------------------------------------------------+
|  Owner account created for the admin console             |
|  Email:    admin@webxstudio.me                           |
|  Password: <generated>                                   |
+----------------------------------------------------------+
```

To choose the login yourself, copy `.env.example` to `.env` and set `ADMIN_EMAIL` / `ADMIN_PASSWORD` (10+ characters) **before** the first run.
Afterwards, change the password in **Admin → Security & team**. If you are locked out:

```bash
npm run admin:reset -- --email you@example.com --password "a-new-long-password"
```

> **Demo workspace:** if the API isn't running, the sign-in screen offers a clearly labelled demo console that stores data in that browser only.
> In the same situation, the public forms tell visitors to resend their brief by email or WhatsApp, so no lead silently disappears.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + Vite dev server together (:4000 and :5173). Ctrl+C stops both |
| `npm run dev:web` | Only the Vite dev server. `/api` is proxied to `API_PROXY_TARGET` (default `http://localhost:4000`) |
| `npm run server` / `server:watch` | Node API on `PORT` (default 4000); the watch variant reloads on change |
| `npm run build` | Production build → `dist/`: `index.html`, content-hashed, code-split files in `dist/assets/`, plus `public/` (fonts, images). Runs `images` before and `build-seo` after |
| `npm run images` / `images:force` | Re-encode every JPEG/PNG in `public/` as AVIF + WebP at six widths into `public/_img/`, and refresh `src/data/images.generated.json`. Idempotent; `:force` re-encodes everything |
| `npm run seo:check` | Crawl every route on a running server and fail on a missing/duplicate title, a bad canonical, invalid JSON-LD or a dead sitemap URL. `-- https://host` to check production |
| `npm run preview` | Serve the build locally (also proxies `/api`) |
| `npm start` | Build, then serve site **and** API from one Node process on `PORT` |
| `npm run typecheck` | Strict TypeScript check for the web app and the server |
| `npm run test:partners` | End-to-end check of the Student Partner program on a throwaway database |
| `npm run test:rebrand` | Verifies the one-time Novaframe → WebXstudio rename of stored content |
| `npm run admin:reset -- --email … --password …` | Create an owner, or reset a password and sign out its sessions |
| `npm run turso:push` | One-time copy of the local SQLite file into the Turso database (`-- --from=path.db` for another file) |
| `npm run mail:test` | Log in to SMTP and send one sample of every email template to `NOTIFY_EMAIL` |
| `npm run seed:php` | Regenerate `server/php/seed.json` from `src/data/defaults.ts` |

---

## What's inside

**Website** (clean URLs, e.g. `/work/eshopper`):
- Pages: `/` · `/services` and `/services/:id` · `/work` and `/work/:id` (case studies) · `/pricing` · `/studio` · `/tech-stack` · `/insights` and `/insights/:id` · `/contact` · `/book` · `/pay` · `/earn` (Student Partner program) · `/partner` (partner dashboard) · `/confirmation` · `/privacy` · `/terms` · `/sitemap`
- Unknown paths show a helpful 404, served with a real HTTP 404 status so crawlers drop them.
- Old `#/...` links (bookmarks, links in sent emails, anything already indexed) are rewritten to the clean path on arrival, so nothing that used to work breaks.
- **Real work:** eShopper, MovieZone, The Chronicle, World Explorer, the founder portfolio and SAARTHI, with live links, repos and screenshots.
- **Conversion tools:**
  - Booking calendar with live availability and double-booking protection, plus `.ics` and Google Calendar links
  - Project brief form with honeypot and rate limits
  - Online payments (`/pay`) through Razorpay Checkout — UPI, cards, net banking, wallets — with server-side signature verification
  - Premium confirmation page (`/confirmation`) after every brief, booking and payment, with a printable receipt / acknowledgement
  - Price estimator and "why us" comparison table
  - Founding-client offer and WhatsApp links
  - `⌘K` command palette and quick-action dock
  - Live "studio online" status based on working hours
- **No invented social proof:** testimonials ship empty and the section stays hidden until you add real ones.

**Admin console** (`/admin`):

| Section | What you can do | Min. role |
|---|---|---|
| Dashboard | New leads, pipeline value, win rate, upcoming calls, visitors, lead sources, recent activity | admin |
| Analytics | Page views, unique visitors, conversion, top pages, CTA clicks, referrers | admin |
| Leads | Pipeline board (drag between stages), priority, notes, detail drawer, CSV export | admin |
| Call bookings | Confirm, complete or cancel calls, add meeting links, CSV export | admin |
| Subscribers | Newsletter list, CSV export, delete | admin |
| Website content | All 13 sections (services, projects, pricing, team, testimonials, FAQs, process, tech stack, guarantees, why us, rhythm, journey, insights): add, edit, duplicate, reorder, hide/publish, delete. "Reset to defaults" needs admin | editor |
| Site settings | Brand identity, contact details and hours, availability and announcement bar, homepage hero and stats, founding-client offer, call-booking slots, social profiles | admin |
| Advanced | Estimator pricing, comparison table, budget ranges, timelines, booking topics, legal pages | admin |
| Security & team | Your password and active sessions (everyone); content backup (admin); full backup with leads, bookings and subscribers, plus team accounts and roles (owner) | editor |
| Activity log | Audit trail of sign-ins and every change | admin |

Roles: **editor** edits website content, **admin** adds sales data, settings and content backups, and **owner** adds team management and full data export.

---

## Configuration

Copy `.env.example` → `.env` (git-ignored; `server/.env` also works). Every value is optional.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `TURSO_DATABASE_URL` | — | Hosted libSQL database (`libsql://….turso.io`). Set in production; leave empty to use a local file |
| `TURSO_AUTH_TOKEN` | — | Token for the Turso database |
| `DB_PATH` | `server/webxstudio.db` | Local SQLite file, used only when `TURSO_DATABASE_URL` is empty |
| `CORS_ORIGIN` | *(any origin)* | Comma-separated list of sites allowed to call the API |
| `TRUST_PROXY` | private ranges | Set `1` behind one reverse proxy so rate limits and logs see real IPs |
| `SESSION_DAYS` | `7` | Admin session lifetime |
| `TZ_OFFSET_MINUTES` | `330` | Day buckets for charts (330 = IST) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | — | First owner account. Used only while no admin exists |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` | — | Enables email notifications |
| `MAIL_FROM` / `NOTIFY_EMAIL` | site email | Sender address, and the inbox that receives alerts |
| `SEND_CONFIRMATIONS` | `true` | Set `false` to stop confirmation emails to clients |
| `SITE_URL` | *(request host)* | **Set this in production.** Pins every canonical URL, `og:url` and sitemap entry to one origin, so the same page reached via `*.onrender.com` or a bare-vs-www mismatch cannot be indexed twice. Also used for links in emails, and required by `postbuild` to emit a static `dist/sitemap.xml` |
| `TURSO_EMBEDDED_REPLICA` | off | `1` keeps a local copy of the Turso database on disk so reads are local instead of a network round-trip. Needs a writable filesystem and pulls the whole database on boot |
| `TURSO_SYNC_INTERVAL` | `60` | Seconds between background pulls from the Turso primary |
| `CONTENT_CACHE_TTL_MS` | `5000` | How long the in-memory site-content cache may go without re-checking the stored version. Admin edits apply immediately regardless |

---

## Performance and SEO

Each page has its own URL, and the Node server fills in that page's metadata **before** sending the
HTML — so crawlers and link-preview scrapers, which never run the app's JavaScript, read real tags.

- **One source of truth for metadata.** `src/lib/seo.ts` turns a path plus the live content into a
  title, description, canonical URL, Open Graph/Twitter card and JSON-LD. The browser applies it on
  navigation (`src/lib/useSeo.ts`); the server injects the same result into `index.html`
  (`server/seo.ts`), between the `<!-- seo:start -->` / `<!-- seo:end -->` markers. They cannot drift.
- **Structured data** per page type: `ProfessionalService` everywhere, plus `WebSite` and `FAQPage`
  on the home page, `Service` with an `Offer` (and its starting price) on service pages,
  `CreativeWork` on case studies, `BlogPosting` on articles, `FAQPage` + `OfferCatalog` on pricing,
  and a `BreadcrumbList` on everything below the top level.
- **`/sitemap.xml` and `/robots.txt`** are generated from the database, so publishing a case study
  lists it immediately, with a per-item `<lastmod>`. `postbuild` also writes static copies into
  `dist/` for static or PHP hosting (needs `SITE_URL`).
- **Duplicate paths** (`/portfolio`, `/about`, `/capabilities`) still render, but point their
  canonical tag at one address so they never compete with it.
- **Private pages** (`/admin`, `/partner`, `/pay`, `/confirmation`) are `noindex` and disallowed in
  `robots.txt`. Unknown paths return a real 404.
- **Images** are re-encoded to AVIF and WebP at six widths by `npm run images`, and `<Picture>`
  serves the smallest file that fits the display size with `width`/`height` set to keep layout
  shift at zero. The home page's images went from ~580 kB to ~19 kB.
- **Site content is cached in memory** and served with a strong ETag, so a repeat visit costs a
  `304` with no body instead of ~50 kB and ~16 database queries. An admin save invalidates it at once.
- **three.js** stays out of the main bundle: it is fetched only once the hero is on screen, the page
  has loaded and gone idle, and only on devices that will render it. Phones get a lighter scene,
  Data Saver and very low-memory devices get static artwork, and the scene steps its own quality
  down if it measures frames it cannot deliver.

Verify any deployment with `npm run seo:check -- https://your-host`.
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | — | Enables online payments. `rzp_test_…` keys = test mode, `rzp_live_…` = real money |
| `PAYMENT_CURRENCY` | `INR` | Currency for Razorpay orders |
| `RAZORPAY_WEBHOOK_SECRET` | — | Optional. Enables `POST /api/payments/webhook` (see below) |
| `SITE_URL` | — | Public site URL, used for "Book a call" and admin links inside emails |
| `VITE_API_URL` | `/api` | Build-time API URL when the API is on another domain |
| `API_PROXY_TARGET` | `http://localhost:4000` | Where `npm run dev:web` / `preview` proxy `/api`. `npm run dev` sets it from `PORT` |

**Email:** with `SMTP_HOST` set, each new enquiry, booked call or payment sends you an alert (Reply-To is the client) and sends the client a branded confirmation — call bookings include a calendar invite, payments an official receipt.
Sending runs in the background; a failed send is logged and never blocks the form. The server checks the SMTP login at start-up and logs the reason if it fails.
With **Brevo**, use the SMTP tab's login and an SMTP key (`xsmtpsib-…`), make `MAIL_FROM` a verified sender, and authorise your server's IP under Settings → Security → Authorized IPs (otherwise Brevo answers `525 Unauthorized IP address`). For Gmail, use an App Password.
Email and payments are only available in the Node edition.

**Payments:** the browser asks the API to create a Razorpay order (the amount is fixed server-side), opens Razorpay Checkout, then sends the signed result to `/api/payments/verify`.
The server checks the HMAC signature, captures the payment if the account uses manual capture, marks it paid, logs it on the payer's lead and sends the receipt. Every step is idempotent.
For production, also add a webhook in Razorpay Dashboard → Webhooks (`https://<your-domain>/api/payments/webhook`, events `payment.captured` and `order.paid`) with the same secret as `RAZORPAY_WEBHOOK_SECRET` — it confirms payments even if the visitor closes the tab.
Share pre-filled payment links like `/#/pay?amount=5000&for=Website%20advance`. To go live, complete Razorpay KYC and swap in the `rzp_live_` keys.

**Content defaults:** `src/data/content.ts` and `src/data/content-extra.ts`, combined in `src/data/defaults.ts`, have three jobs:
- seed a fresh database
- render the site instantly before the API responds
- power "Reset to defaults"

The database is seeded only once per section, so a section you empty in the console stays empty. After changing the defaults, run `npm run seed:php`.

---

## Deployment

**A. One Node server + Turso** (Render free plan, Railway, VPS …)

```bash
npm ci            # dev dependencies are needed: the build uses Vite and the server runs through tsx
npm start         # builds, then serves the site + /api on $PORT
```

Create a free database at [turso.tech](https://turso.tech), then set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
along with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ORIGIN` and `TRUST_PROXY=1`.
Because the data lives in Turso, no persistent disk is required and the database survives restarts,
redeploys and free-tier sleep. `render.yaml` deploys exactly this as a Render Blueprint.

To carry your local data over to Turso once:

```bash
npm run turso:push          # copies server/webxstudio.db → the Turso database
```

Without `TURSO_DATABASE_URL`, the server falls back to a local SQLite file (`DB_PATH`), which is what
`npm run server` uses in development.

> **Renamed from Novaframe Studio.** On first boot after the rename the server rewrites the old studio
> name inside the site settings and the CMS collections — admin edits are kept, and leads, bookings and
> payments are left untouched (`renameBrand()` in `server/db.ts`, covered by `npm run test:rebrand`).
> A local `server/novaframe.db` also keeps being used when no `webxstudio.db` sits beside it, so no data
> is orphaned. Remember to update `MAIL_FROM` and `ADMIN_EMAIL` wherever they are set in production.

**B. Static site + separate API.** Build with `VITE_API_URL=https://api.your-domain.com/api npm run build` and upload `dist/` to any static host.
Run the API anywhere, with `CORS_ORIGIN=https://your-domain.com`.

**C. Shared hosting: PHP 8 + MySQL** (Hostinger, cPanel, Apache)

1. Create a MySQL database and user, then import `server/php/schema.sql` into it (phpMyAdmin → Import).
2. Create `server/php/.env` with these values:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (10+ characters)
   - optional: `CORS_ORIGIN`, `SESSION_DAYS`, `TZ_OFFSET_MINUTES`
3. Upload the contents of `server/php/` to `public_html/api/`. Include `.htaccess`, which routes requests and blocks `.env`, `seed.json`, `config.php` and `schema.sql`.
4. Run `npm run build` and upload the contents of `dist/` to `public_html/` (`index.html`, `assets/`, `fonts/` and the image folders). The site calls `/api` on the same domain.
   When you update the site, upload the new build over the old one. Files in `assets/` have content-hashed names, so older ones can stay; a visitor whose browser still has the previous page cached is reloaded onto the new build automatically.
5. Open `https://your-domain.com/#/admin` and sign in. Content is seeded from `seed.json` on the first request.

Passwords use PBKDF2-SHA512 with 100k iterations in both editions, so the hashes are compatible between them.

---

## API

Responses are `{ "ok": true, "data": … }` or `{ "ok": false, "error": "…", "errors"?: { field: message } }`.
Admin routes need `Authorization: Bearer <token>` from `POST /api/admin/login`.
Tokens are random, stored only as SHA-256 hashes, and can be revoked per session.

| Endpoint | Access |
|---|---|
| `GET /api/health` · `GET /api/content` · `GET /api/content/:collection` | public |
| `POST /api/enquiries`: validated, honeypot field `website`, rate-limited | public |
| `GET /api/bookings/availability?from=YYYY-MM-DD&to=YYYY-MM-DD` | public |
| `POST /api/bookings`: returns 409 if the slot was just taken | public |
| `POST /api/subscribe` · `POST /api/events` | public |
| `GET /api/payments/config` · `POST /api/payments/order` · `POST /api/payments/verify`: rate-limited | public |
| `POST /api/payments/webhook`: Razorpay-signed, only when `RAZORPAY_WEBHOOK_SECRET` is set | Razorpay |
| `POST /api/admin/login`: 8 attempts per 15 minutes | public |
| `GET /api/admin/me` · `POST /api/admin/logout` · `POST /api/admin/password` · `GET /api/admin/sessions` · `DELETE /api/admin/sessions/:id` | editor |
| `GET`/`POST /api/admin/content/:collection` · `PUT`/`DELETE /api/admin/content/:collection/:id` · `POST /api/admin/content/:collection/reorder` | editor |
| `GET /api/admin/settings` | editor |
| `PUT /api/admin/settings/site` · `PUT /api/admin/settings/advanced` · `POST /api/admin/content/:collection/reset` | admin |
| `GET /api/admin/overview` · `GET /api/admin/analytics?days=30` · `GET /api/admin/audit` | admin |
| `GET /api/admin/enquiries` · `GET`/`PATCH`/`DELETE /api/admin/enquiries/:id` · `POST /api/admin/enquiries/:id/notes` | admin |
| `GET /api/admin/bookings` · `PATCH`/`DELETE /api/admin/bookings/:id` | admin |
| `GET /api/admin/subscribers` · `DELETE /api/admin/subscribers/:id` | admin |
| `GET /api/admin/export?scope=content` (admin) · `GET /api/admin/export?scope=all` (owner) | admin / owner |
| `GET`/`POST /api/admin/users` · `PATCH`/`DELETE /api/admin/users/:id` | owner |

```bash
curl -X POST http://localhost:4000/api/enquiries -H "Content-Type: application/json" \
  -d '{"name":"Your Name","email":"you@example.com","service":"Web Development","budget":"Not sure yet","details":"A storefront with 200 products and Razorpay checkout."}'
```

---

## Production checklist

- Save the generated owner password, or set `ADMIN_PASSWORD`, then change it in the console. The variable is ignored once an admin exists.
- Set `CORS_ORIGIN` to your domain(s). By default the API accepts calls from any origin.
- Serve everything over **HTTPS**, because admin tokens are bearer tokens.
- Set `TRUST_PROXY=1` behind a proxy. Rate limits are kept in memory per process.
- Back up the database regularly: Admin → Security & team → Backups, or copy the SQLite file while the server is stopped.
- The Node server compresses responses (gzip/brotli) and caches `dist/assets/*` for a year (`index.html` is always revalidated). On Apache/shared hosting, make sure gzip or brotli is on (most hosts enable it by default).

---

## Performance notes (mobile)

The site is tuned to stay responsive on mid-range phones. Keep these in mind when changing it:

- **Code splitting:** only the home page ships in the main bundle. Other pages, the admin console and three.js load on demand (`src/lib/lazyPage.tsx`); public pages are prefetched while the browser is idle.
- **Hero scene:** `HeroCanvas` loads three.js after the page has loaded and gone idle. Phones and small tablets get a light version (matcap shading, 30 fps, pauses while scrolling); Data Saver or very low-memory devices get static artwork.
- **No blur on touch screens:** `backdrop-filter` and large `filter: blur()` glows are desktop-only (`pointer-fine:` variants, `.lux-glass`, gradient glows). Blur is recomputed on every scrolled frame and is the main cause of lag on phones.
- **Animations only when visible:** looping animations pause when off screen (`usePauseOffscreen`) or inside hidden panels, and page sections use `content-visibility: auto`. Prefer animating `transform`/`opacity` only.
- **Fonts** are self-hosted in `public/fonts` and preloaded in `index.html`.
- **Tap targets:** fixed overlays must not cover content (the floating contact dock is click-through except for its button), and hover effects live behind `@media (hover: hover)` so a tap is never spent on a hover state.

---

## Project structure

```text
public/            brand mark, project screenshots, founder photo, self-hosted fonts
server/
  index.ts         Express API (public + admin routes, static dist serving)
  db.ts            SQLite schema, migrations, seeding, password + token hashing
  mailer.ts        SMTP email: branded templates for leads, bookings and payment receipts
  mail-test.ts     `npm run mail:test` — sends a sample of every email
  reset-admin.ts   owner recovery CLI · export-seed.ts → php/seed.json
  php/             PHP 8 + MySQL edition (api.php, config.php, schema.sql, .htaccess, seed.json)
src/
  data/            types and default content (single source of truth)
  lib/             API client, offline adapter, content store, router, site helpers
  components/      design system, hero scene, estimator, navbar, footer, …
  components/admin console UI: leads board, bookings, content editor, settings, security
  pages/           public pages + AdminPortal
```
