# Novaframe Studio — Company Website

A production-grade studio website: React + TypeScript frontend, a real **Express/Node** API with
**SQLite**, and an equivalent **PHP 8 + MySQL** API for shared-hosting deployments.

---

## 1. Tech stack (Languages & Tools)

### Frontend

| Language / tool | How it is used |
|---|---|
| **HTML5** | `index.html` and semantic JSX markup |
| **CSS3 + Tailwind CSS v4** | Design tokens, animations, and responsive utilities in `src/index.css` |
| **JavaScript (Vanilla)** | Form logic, navigation, counters, and `IntersectionObserver` interactions |
| **TypeScript** | Strict-mode application logic and type-safe React components |
| **React 19** | Components, hooks, and the single-page application |
| **Three.js** | Real-time WebGL 3D hero scene in `src/components/HeroCanvas.tsx` |

### Backend

| Language / tool | How it is used |
|---|---|
| **Node.js + Express** | REST API server in `server/index.ts` |
| **PHP 8 + PDO** | MySQL API alternative for shared hosting in `server/php/api.php` |
| **Token-based admin authentication** | Session tokens, protected admin routes, and role-based access |
| **Node.js `crypto` / PBKDF2** | Password hashing with SHA-512 and 100,000 iterations |

### Database

| Database / language | How it is used |
|---|---|
| **SQLite (`better-sqlite3`)** | Main local database in `server/db.ts` |
| **MySQL** | Production/shared-hosting database |
| **SQL** | Normalized tables, indexes, prepared statements, constraints, and reporting queries |

### Deployment / hosting

- **Frontend:** Vite development server and single-file production build (`dist/index.html`)
- **Backend:** Node.js + Express or PHP 8 + MySQL
- **Database:** SQLite for local development or MySQL for production

### Project structure

```text
.
├── public/              # Static assets and branding
├── server/              # Node.js API, SQLite database, and PHP/MySQL alternative
├── src/
│   ├── components/      # Reusable UI and admin components
│   ├── data/            # Site content, services, projects, and legal copy
│   ├── lib/             # API client and routing helpers
│   └── pages/           # Application pages and route views
├── index.html           # HTML entry point
├── package.json         # Scripts and dependencies
└── vite.config.ts       # Vite and single-file build configuration
```

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
