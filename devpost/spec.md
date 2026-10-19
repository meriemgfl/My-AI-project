---
doc: spec
status: approved
---

# Skincare Routine Personaliser — Technical Spec

## How This Works, In Plain Language

The phone-sized app runs in a browser. Its React screens ask about skin concerns, products, and schedule preferences. When a screen needs saved information or a suggestion, it sends a small JSON request to a local Express server. That server runs the recommendation rules and reads or writes the SQLite database using SQL. SQLite is one file on this computer, so the product list, answers, and saved routines are still there after the browser closes.

The recommendation rules are ordinary, visible JavaScript—not an AI service. They compare the person's selected concerns with product information, omit expired items, use product guidance when it exists, and otherwise use the person's schedule preferences. The app can explain its fit score from those matching tags. A missing combination rule means “not assessed,” not “guaranteed safe.”

This shape gives the learner a real browser-to-API-to-SQL path to study, while keeping accounts, hosting, and external services out of the proof of concept.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`, `Questionnaire and Routine Suggestions`, `Product List`, and `Routine Details`.

1. React loads saved routines and owned products from the local API.
2. The person searches the small catalog, selects the products they own, and enters an expiry date if known. Express stores each owned item separately from the shared catalog record.
3. The questionnaire saves concerns and schedule preferences. Previously selected owned products are preselected.
4. React sends the selected concerns, owned-product IDs, and schedule preferences to the suggestion endpoint.
5. Express queries SQLite for the selected items, filters expired products, and runs deterministic matching and ordering rules. It returns routine options with the matching reasons and any authored product notes.
6. The person chooses an option. Express saves its routine and ordered steps in SQLite.
7. React reloads the saved routine from the API; closing and reopening the browser does not lose it.

## Stack

| Part | Choice | Why it fits |
|---|---|---|
| Language | JavaScript (ES modules) | One language for screens, API, and rules is easier to follow while learning. |
| UI | React 19.3.0 + Vite 8.3.1 | React and Vite were learner-approved; Vite gives a small local dev server and production build. |
| Local API | Node.js 22.12+ + Express 5.2.1 | Keeps product matching and database access outside the screen code. Node 22.12+ meets Vite 8's documented minimum; this computer has Node 24.18.0. |
| Database | SQLite + `better-sqlite3` 13.0.3 | Learner chose a small database to learn SQL. SQLite is a single local file; direct SQL keeps joins and writes visible. |
| Browser ↔ API format | JSON over local HTTP | A familiar request/response boundary, with no account or network service. |

The exact patch versions will be recorded in `package-lock.json` when dependencies are installed. **Build check:** confirm the installed Node version and that `better-sqlite3` provides a prebuilt binary for the learner's Windows/Node combination before building features.

Docs: [React](https://react.dev/), [Vite guide](https://vite.dev/guide/), [Vite Node requirements](https://vite.dev/guide/), [Express 5 migration guide](https://expressjs.com/en/guide/migrating-5/), [SQLite](https://www.sqlite.org/about.html), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3).

## Where It Runs and How Someone Tries It

- **Runtime:** local Node process, local SQLite file, and a phone-width browser viewport on the learner's computer.
- **Requirements:** Node.js 22.12 or newer, npm, and a modern browser. No API keys, account, internet service, or deployment is needed to use the built app.
- **Start:** from the project root, run `npm install`. In one terminal run `npm run server`; in a second terminal run `npm run dev`. Open `http://localhost:5173` and use browser responsive/device mode at a phone width for the demo recording.
- **Database file:** `data/skincare.sqlite`; this is local user data and must be gitignored. The catalog seed is code in the repository and can repopulate a new database.
- **Production build:** `npm run build` creates the static UI bundle. Serving it publicly is optional and is outside this POC; the required hackathon demo still needs a short video and public GitHub repository.

## Look and Feel

Use a phone-first layout with generous white space, a quiet warm-neutral palette, restrained accent color, and short, reassuring labels. Keep product cards readable rather than dense. The learner's reference was a minimal skincare shopping interface; borrow its spacing and calm presentation, not its checkout flow. Exact colors and typeface can be selected during the UI build without changing the direction. The responsive browser UI is the target; no native mobile app is required.

## Components

### React screens and shared state

Home/saved routines, questionnaire, product list and product detail, suggestions, and routine detail. Shared state comes from API responses; the browser is not the source of truth for saved data.

PRD ref: `prd.md > Home and Saved Routines`, `Questionnaire and Routine Suggestions`, `Product List`, and `Routine Details`.

### Express API

Validate request fields, call the matching/data modules, and return JSON. Routes:

| Route | Use |
|---|---|
| `GET /api/products?q=` | Search the preloaded catalog. |
| `GET /api/owned-products` / `POST /api/owned-products` / `DELETE /api/owned-products/:id` | Read, add, or remove an owned item and its optional expiry date. |
| `GET /api/profile` / `PUT /api/profile` | Read or save questionnaire preferences on this device. |
| `POST /api/suggestions` | Return eligible routine options for selected concerns, products, and schedule. Does not save them. |
| `GET /api/routines` / `POST /api/routines` / `GET /api/routines/:id` | List, save a chosen suggestion, and reopen a saved routine. |

### Recommendation rules

Use catalog concern tags to calculate a transparent fit score: matched selected concerns divided by selected concerns, expressed as a percentage. Display the matched concern labels so the score is explainable; do not present it as clinical efficacy. Only use products owned by the person and not expired. Use catalog usage timing/frequency if supplied; otherwise use questionnaire preferences. Put product types in their curated application order (cleanser, toner, serum, eye cream, moisturiser, sunscreen), with sunscreen last in a daytime routine. Provide benefits as catalog text, not generated claims. Any ingredient-combination caution must be explicitly authored in the catalog with a source; absent data is labelled “Not assessed.”

Routine order supports the PRD's learner-provided sequence—serums, moisturiser, then sunscreen—and includes the owned cleanser, toner, and eye cream in their appropriate steps where applicable. No product outside the user's owned list is suggested.

PRD ref: `prd.md > Questionnaire and Routine Suggestions` and `Routine Details`.

### Persistence and database access

The API opens the local SQLite file and uses parameterized SQL queries. A small data-access module keeps SQL separate from route and matching logic. Seed code inserts the curated product records on first database creation; it must not overwrite the person's saved data on later starts.

## Data Model

SQLite stores five tables. `id` values are local integer primary keys; foreign keys are enabled. Concern lists and product tags are JSON text for this small POC, while owned items and routine steps use relational rows so the learner can practise joins.

| Table | Important fields | Relationship and behavior |
|---|---|---|
| `catalog_products` | `id`, `name`, `brand`, `category`, `ingredients`, `estimated_price`, `currency`, `benefits_json`, `concerns_json`, `usage_time`, `uses_per_week`, `application_order`, `combination_notes_json`, `source_url` | Seeded reference data. One row can be selected as an owned item. A source URL supports inspection of claims. |
| `owned_products` | `id`, `catalog_product_id`, `expires_on` (nullable), `added_at` | One row per item the person owns; several owned items may point to one catalog product. Missing expiry stays eligible and is labelled. Past expiry is filtered at suggestion time. |
| `profile_preferences` | fixed `id = 1`, `skin_type`, `concerns_json`, `preferred_period`, `preferred_time`, `uses_per_week`, `updated_at` | Single-device questionnaire answers. The one-row design reflects a no-account demo. |
| `routines` | `id`, `period`, `preferred_time`, `uses_per_week`, `concerns_json`, `fit_score`, `created_at` | Each chosen suggestion is saved as one routine. |
| `routine_steps` | `id`, `routine_id`, `owned_product_id`, `step_order`, `purpose_text` | Ordered product references for a routine; foreign keys prevent dangling steps. |

Removing an owned item referenced by a saved routine should not silently erase routine history: block removal with a clear message for the POC, or remove the item only after the person confirms. Closing the browser leaves data in SQLite. There is no sync or backup in this POC.

## File Structure

```text
project/
├── devpost/
│   ├── scope.md                 # Approved product boundary
│   ├── prd.md                   # Approved user behaviors
│   ├── spec.md                  # This technical blueprint
│   └── spec.html                # Visual, offline-friendly review
├── src/
│   ├── main.jsx                 # React entry point
│   ├── App.jsx                  # Screen navigation and shared app state
│   ├── api/client.js            # Calls to the local JSON API
│   ├── components/              # Product, routine, and form building blocks
│   ├── pages/                   # Home, questionnaire, results, inventory, details
│   └── styles/                  # Responsive phone-first styles
├── server/
│   ├── index.js                 # Express app and API routes
│   ├── db.js                    # SQLite connection, schema, and migrations
│   ├── catalog-seed.js          # Curated product records and source URLs
│   ├── matching.js              # Transparent scoring, eligibility, and ordering
│   └── data-access.js           # Parameterized SQL reads and writes
├── data/                        # Local database; gitignored
├── package.json
├── package-lock.json
└── .gitignore
```

## External Services and Dependencies

There are no external runtime services: no live AI, product lookup API, analytics, login provider, or hosted database. Product facts are curated into the local seed from official brand product pages, with a source URL beside each catalog record. Prices are estimates and retain the currency of their cited listing; they do not affect matching. React, Vite, Express, SQLite, and `better-sqlite3` are installed dependencies, not hosted services.

## Important Failure Modes

- **Database file cannot open or schema is new** → initialize schema and seed the catalog; show a readable setup error rather than a blank screen.
- **A product name has multiple variants or no verified usage details** → keep it out of ingredient-specific rules until confirmed; show the source and label missing data instead of guessing.
- **No eligible owned products match the selected concerns** → explain that no match was found and let the person change concerns or selections, as required by the PRD.

## What Was Simplified and Why

- **Local SQLite and one profile row** instead of accounts, cloud hosting, and sync — the demo is intentionally one-device, while still giving the learner an authentic SQL-backed app.
- **Curated seed catalog** instead of barcode lookup or a product API — the POC should use a few owned products with inspectable source information.
- **Transparent tag matching** instead of a live AI model — scores and suggestions can be understood, reproduced, and corrected without API keys or opaque claims.
- **Authored combination notes** instead of a universal ingredient-safety engine — unknown combinations stay “Not assessed”; a complete safety checker would require broader, maintained evidence and is outside the POC.
- **No public deployment** — the local phone-width demo keeps the system small. The demo video and public repository remain required submission items.

## Decisions and Open Issues

### Learner choices

- React and Vite are acceptable for the phone-sized browser demo.
- Learning SQL is part of the build, so the app will use SQLite behind a local API instead of browser-only storage.
- The starter catalog should be based on products the learner owns: SKIN1004 Centella eye cream, haruharu wonder sunscreen, numbuzin No.5 toner, and Centellian24 oil cleanser.
- Suggestions use product information first for timing/frequency and the person's preference when guidance is missing; routines stay on one device.

### Implementation decisions derived from those choices

- Node/Express separates UI, recommendation rules, and SQL so the data flow is visible and testable in small build steps.
- A single profile row plus local foreign keys fits the no-account POC; concerns stay as JSON text until a larger product requires more advanced querying.
- Recommendation scores measure tag overlap only. They are not a prediction of treatment results.
- Product information must be checked against exact official product variants before it is seeded. The learner identified the sunscreen as haruharu wonder Black Bamboo Top-to-Toe SPF Veil SPF 50+/PA++++; the official product listing now supplies its ingredients, daily application guidance, and current USD estimate. The likely matches for the learner's SKIN1004 eye cream and Centellian24 cleansing oil still need package confirmation.
- The learner asked why a database was not being used; we compared browser storage with a database and settled on SQLite to make SQL part of the learning outcome. The tradeoff is running a local server as well as the UI.

### Open issues

- Confirm the exact SKIN1004 and Centellian24 variants from packaging if the likely official matches above do not look familiar.
- Confirm which currency to use for the estimated prices; the official listings found so far show USD. Price is display-only and can be left as an estimate from the cited source.
- Working app title remains open, as carried from `prd.md > Open Questions`.

## Documentation

- [React documentation](https://react.dev/)
- [Vite guide and requirements](https://vite.dev/guide/)
- [Express 5 migration guide](https://expressjs.com/en/guide/migrating-5/)
- [SQLite: about](https://www.sqlite.org/about.html)
- [better-sqlite3 repository and installation notes](https://github.com/WiseLibs/better-sqlite3)
- Product sources: [SKIN1004 eye cream](https://www.skin1004.com/collections/love-yourself/products/probio-cica-bakuchiol-eye-cream), [numbuzin No.5 toner](https://us.numbuzin.com/products/no-5-vitamin-boosting-essential-toner), [Centellian24 cleansing oil](https://centellian24.com/products/centellian24-madeca-matcha-pore-cleansing-oil), [haruharu Black Bamboo Top-to-Toe SPF Veil](https://haruharuwonder.com/products/haruharuwonder-black-bamboo-top-to-toe-spf-veil-100ml).
