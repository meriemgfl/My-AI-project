---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [x] **1. Get a concern-matched routine suggestion**
  Becomes usable: The app runs at phone width; the person chooses skin concerns, products they own, and schedule preferences, then sees a rule-based routine suggestion with matching reasons and ordered steps. The product catalog is read from SQLite; this slice does not yet save the person's inventory or routine after restart.
  Why now: It proves the unique kernel—the questionnaire-to-routine path—first, while bringing the browser, local API, and database together in one runnable increment. Catalog accuracy and the matching rules are the key early risks.
  PRD ref: `prd.md > The Core Journey` (steps 2–5), `Questionnaire and Routine Suggestions`, `Routine Details`
  Spec ref: `spec.md > Stack`, `Where It Runs and How Someone Tries It`, `Components > Express API`, `Components > Recommendation rules`, `Components > Persistence and database access`, `Data Model`, `File Structure`
  Build: Scaffold the React/Vite UI and Express API as part of this usable flow; add the SQLite connection/schema and first-run seed for the small catalog; implement the questionnaire and a suggestion screen; query catalog products through the API; calculate and explain concern-tag fit, exclude products whose documented timing conflicts with the chosen period, use schedule fallback, and order steps. Add `/data/` to `.gitignore`. Verify the exact owned-product variants before adding product-specific ingredient or use claims.
  Verify (mechanical): Run `npm run build`; start the API and Vite app; call `GET /api/products` and `POST /api/suggestions` with a sample selection; confirm the response includes matched concern labels, score, schedule, and ordered products, and check the browser console/API terminal for errors.
  Learner check: Open the phone-width app, choose concerns and products you own, and create a suggestion. Tell me whether the routine and its explanation feel understandable and useful, and whether the product versions shown match your packages.
  Commit: `Build first routine suggestion flow`

- [x] **2. Manage owned products and preferences**
  Becomes usable: The person can search or browse the catalog, add products to their own list, enter an expiry date or leave it unknown, and see those choices after restarting the app. Saved products are preselected in a new questionnaire; expired products are omitted from new suggestions.
  Why now: The first slice proves the recommendation kernel; this makes its input a real, persistent personal inventory and catches the ownership/expiry data model before saved routine history depends on it.
  PRD ref: `prd.md > Product List and Expiration`, `Questionnaire and Routine Suggestions`, `States and Boundaries`
  Spec ref: `spec.md > Components > React screens and shared state`, `Components > Express API`, `Data Model`, `Important Failure Modes`
  Build: Add catalog search/detail and inventory views; write owned product rows with nullable expiry dates; save questionnaire preferences in the single profile row; preselect saved products; filter past-expiry items in the suggestion query; show “Missing expiry date” for unknown dates.
  Verify (mechanical): Run `npm run build`; use the API to add one owned item with an expiry date and one without; restart the API and read both back; request a suggestion and confirm the expired item is excluded while the unknown-date item remains eligible.
  Learner check: Add one of your products with an expiry date and another without one, reload the app, and check that the list labels and saved entries make sense.
  Commit: `Persist owned products and questionnaire preferences`

- [x] **3. Save and reopen routines**
  Becomes usable: The home screen shows chosen routines with period, clock time, frequency, and target concerns; opening a routine shows its ordered steps. The saved routine remains after closing and reopening the app on this device.
  Why now: This completes the approved core journey after the questionnaire, product data, and suggestion rules are in place; it makes persistence work end to end rather than adding a detached database layer.
  PRD ref: `prd.md > The Core Journey` (steps 6–7), `Home and Saved Routines`, `Saved Routines`, `Routine Details`, `States and Boundaries`
  Spec ref: `spec.md > Components > React screens and shared state`, `Components > Express API`, `Data Model`, `Where It Runs and How Someone Tries It`
  Build: Add the saved-routines home view; save a selected suggestion as a routine and ordered routine steps; load routine cards and detail through the API; handle removing an owned item referenced by a saved routine without silently deleting routine history.
  Verify (mechanical): Run `npm run build`; save a suggestion through the API; restart the API and confirm `GET /api/routines` and `GET /api/routines/:id` return its schedule, concerns, and ordered products.
  Learner check: Complete the questionnaire, save a suggestion, return home, open it, then restart and open it again. Check that the schedule and step order are what you expect.
  Commit: `Save and reopen skincare routines`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 1 and slice 2; the learner corrected the Haruharu sunscreen to Black Bamboo Top-to-Toe SPF Veil, approved the visual direction after cohesion feedback, and confirmed that expiry labels persist after reload.
- [x] Final kick-the-tires exploration and feedback completed — after slice 3; the learner saved a suggestion, returned Home, reopened the routine, and approved its schedule and step order.

## Final Review

- [x] Final review complete — visual feedback was resolved; the learner confirmed the saved routine schedule and ordered steps look right. Shipping preparation is a separate next phase.

## Code Tour and App Map

- [x] Learning activity complete — guided route with a source-grounded recap and SQL practice
- [x] Optional edit and transfer reflection addressed — offered a project-grounded follow-on; no personal reflection stored
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Reviewed the saved-routine path in `devpost/app-map.html`; API save/detail survived a server restart; production build passed. The learner confirmed the routine looked right after saving and reopening it.
Route and stops: `src/App.jsx` (`createSuggestion`, `persistRoutine`, `openRoutine`, saved-routine Home card, routine detail) → `src/api/client.js` → `server/index.js` (`POST /api/routines`, `GET /api/routines`, `GET /api/routines/:id`) → `server/matching.js` (`buildSuggestions`) → `server/data-access.js` (`saveSuggestedRoutine`, `listSavedRoutines`, `getSavedRoutine`) → `server/db.js` (`saved_routines`, `routine_steps`).
Edit outcome: Optional small UI or data-model extension offered in the app map; not requested yet.
Reflection: The map connects ordered routine steps to a sewing-project plan; no personal answer stored.
Activity mode: Brief source-grounded recap and self-guided HTML map.

## Revisions

- Resolved dependency versions to React 19.3.0, Vite 8.3.1, Express 5.2.1, and better-sqlite3 13.0.3 — the agreed version ranges installed successfully on Node 24.18.0; the production build passes.
- Updated the haruharu wonder catalog entry to Black Bamboo Top-to-Toe SPF Veil after the learner identified the package and the official listing confirmed its details.
- Completed the owned-product and profile slice; the learner confirmed the inventory and expiry-date labels still work after reload. Restored missing shared form styles after observing browser-default controls and inconsistent product-card spacing in the live questionnaire.

- Added local API checks for catalog IDs, nullable ISO expiry dates, saved profile preferences, and only recommending owned, unexpired products. Verified after an API restart that an unknown expiry stays null and an expired item is omitted from suggestions. Production build passed after the UI and schema changes.
- Implemented saved routines and ordered product snapshots; verified save and reopen through the API after restarting the server. Removed the temporary verification routine so the learner can save their own routine during the final hands-on check.
- The learner saved and reopened a routine in the app and confirmed that the schedule and step order looked right.
