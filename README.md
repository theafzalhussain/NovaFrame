# Novaframe Studio — Company Website

A production-grade studio website: React + TypeScript frontend, a real **Express/Node** API with
**SQLite**, and an equivalent **PHP 8 + MySQL** API for shared-hosting deployments.

---

## 1. Language & stack map

This matches the planned structure exactly:

| Layer | Languages / tools | Where in this repo |
|---|---|---|
| **Frontend markup** | HTML5 | `index.html`, semantic JSX in `src/pages/*` |
| **Frontend styling** | CSS3 + Tailwind CSS | `src/index.css` (design tokens, keyframes, utilities) |
| **Frontend logic** | JavaScript / **TypeScript** | everything under `src/`, strict mode |
| **Frontend UI** | React 19 | `src/App.tsx`, `src/pages/*`, `src/components/*` |
| **3D / WebGL** | **Three.js** | `src/components/HeroCanvas.tsx` (real WebGL scene) |
| **Backend runtime** | **Node.js + Express** | `server/index.ts` |
| **Backend (alt)** | **PHP 8 + PDO** | `server/php/api.php` |
| **Database** | **SQL** — SQLite & MySQL | `server/db.ts`, `server/php/schema.sql` |

### Frontend
HTML5 semantic structure → Tailwind CSS design system → vanilla JS interactions →
React components in TypeScript → Three.js for the WebGL hero.

### Backend
Node.js + Express REST API. Input validation middleware, admin token guard,
prepared statements, central error handler.

### Database
SQL schema with normalised tables, indexes, a `CHECK` constraint on pipeline status,
and a reporting view. SQLite locally; MySQL in production (`schema.sql`).

---

## 2. Running the project

### Frontend (static SPA)
```bash
npm install
npm run dev        # local dev server
npm run build      # production build → dist/
```

### Backend — Node.js + Express + SQLite (recommended)
```bash
npx tsx server/index.ts                 # starts on :4000
# optional
PORT=5000 ADMIN_TOKEN=super-secret npx tsx server/index.ts
```
Point the frontend at it:
```bash
echo "VITE_API_URL=http://localhost:4000/api" > .env.local
```

### Backend — PHP 8 + MySQL (shared hosting / cPanel)
```bash
mysql -u user -p < server/php/schema.sql   # creates DB + tables + view
# set DB_HOST / DB_NAME / DB_USER / DB_PASSWORD / ADMIN_TOKEN env vars,
# or edit the fallbacks in server/php/config.php
```
Then upload `server/php/` and set `VITE_API_URL` to the PHP endpoint.

> If no API is reachable, the contact form switches to **demo mode**: the brief is
> stored in `localStorage` and a clear notice is shown, so no lead is ever lost.

---

## 3. API reference

Both backends expose the identical contract.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | — | Service + database status |
| `GET` | `/api/services` | — | Active service catalogue from SQL |
| `POST` | `/api/enquiries` | — | Save a project enquiry (validated) |
| `GET` | `/api/enquiries?limit=&offset=` | admin | Paginated lead list |
| `PATCH` | `/api/enquiries/:id` | admin | Update pipeline status |
| `POST` | `/api/subscribe` | — | Newsletter signup |
| `POST` | `/api/events` | — | First-party analytics event |
| `GET` | `/api/stats` | admin | Aggregate dashboard counters |

**Admin auth:** header `X-Admin-Token: <ADMIN_TOKEN>` (or `Authorization: Bearer …`).

Example:
```bash
curl -X POST localhost:4000/api/enquiries \
  -H 'Content-Type: application/json' \
  -d '{"name":"Aarav Mehta","email":"aarav@acme.com","service":"Web Development",
       "budget":"₹1,00,000 – ₹3,00,000","details":"Headless storefront with 4000 SKUs."}'
```

---

## 4. Site structure

**Static pages**
`/` Home · `/services` Capabilities · `/work` Case studies · `/studio` About ·
`/tech-stack` Tech stack · `/pricing` Pricing · `/insights` Articles ·
`/contact` Contact · `/privacy` · `/terms` · `/sitemap`

**Dynamic routes** (all resolve — unknown values fall back to a friendly 404 with suggestions)
`/services/:id` and `/capabilities/:id` · `/work/:id` and `/portfolio/:id` · `/insights/:slug`

---

## 5. Editing content

Nearly all copy lives in two files:

- `src/data/content.ts` — company details, nav, services, packages, projects, team, tech stack, FAQs, testimonials
- `src/data/content-extra.ts` — language matrix, insights articles, legal documents

Replace the placeholder phone, email, Cal.com link and client names before going live.

---

## 6. Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the built output |
| `npx tsx server/index.ts` | Run the Node/Express API |
| `npx tsc --noEmit` | Typecheck the whole project |
