import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { catalogProducts } from './catalog-seed.js';
import { demoCatalogProducts } from './demo-catalog-seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const isDemoMode = process.env.SKINCARE_DEMO === '1';
const dataDirectory = path.resolve(here, isDemoMode ? '../data/demo' : '../data');
fs.mkdirSync(dataDirectory, { recursive: true });

export const db = new Database(path.join(dataDirectory, isDemoMode ? 'skincare-demo.sqlite' : 'skincare.sqlite'));
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS catalog_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    ingredients TEXT,
    estimated_price REAL,
    currency TEXT,
    benefits_json TEXT NOT NULL,
    concerns_json TEXT NOT NULL,
    usage_period TEXT,
    uses_per_week INTEGER,
    application_order INTEGER NOT NULL,
    usage_note TEXT,
    source_url TEXT,
    combination_notes_json TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS profile_preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    selected_concerns_json TEXT NOT NULL DEFAULT '[]',
    period TEXT NOT NULL DEFAULT 'day',
    preferred_time TEXT NOT NULL DEFAULT '08:00',
    uses_per_week INTEGER NOT NULL DEFAULT 7
  );
  INSERT OR IGNORE INTO profile_preferences (id) VALUES (1);
  CREATE TABLE IF NOT EXISTS owned_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL UNIQUE REFERENCES catalog_products(id) ON DELETE CASCADE,
    expiry_date TEXT,
    added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS saved_routines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('day', 'night')),
    preferred_time TEXT NOT NULL,
    uses_per_week INTEGER NOT NULL CHECK (uses_per_week BETWEEN 1 AND 7),
    matched_concerns_json TEXT NOT NULL,
    fit_score INTEGER NOT NULL,
    fingerprint TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS routine_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    routine_id INTEGER NOT NULL REFERENCES saved_routines(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES catalog_products(id) ON DELETE SET NULL,
    step_order INTEGER NOT NULL,
    product_snapshot_json TEXT NOT NULL,
    UNIQUE (routine_id, step_order)
  );
`);

// Keep the catalog row's ID stable while replacing its earlier, unconfirmed label.
db.prepare(`
  UPDATE catalog_products
  SET slug = 'haruharu-wonder-black-bamboo-top-to-toe-spf-veil'
  WHERE slug = 'haruharu-wonder-sunscreen-pending-variant'
`).run();

const insertProduct = db.prepare(`
  INSERT INTO catalog_products (
    slug, name, brand, category, ingredients, estimated_price, currency,
    benefits_json, concerns_json, usage_period, uses_per_week,
    application_order, usage_note, source_url, combination_notes_json
  ) VALUES (
    @slug, @name, @brand, @category, @ingredients, @estimatedPrice, @currency,
    @benefits, @concerns, @usagePeriod, @usesPerWeek,
    @applicationOrder, @usageNote, @sourceUrl, '[]'
  ) ON CONFLICT(slug) DO UPDATE SET
    name = excluded.name,
    brand = excluded.brand,
    category = excluded.category,
    ingredients = excluded.ingredients,
    estimated_price = excluded.estimated_price,
    currency = excluded.currency,
    benefits_json = excluded.benefits_json,
    concerns_json = excluded.concerns_json,
    usage_period = excluded.usage_period,
    uses_per_week = excluded.uses_per_week,
    application_order = excluded.application_order,
    usage_note = excluded.usage_note,
    source_url = excluded.source_url
`);

const seedCatalog = db.transaction((products) => {
  for (const product of products) {
    insertProduct.run({
      ...product,
      benefits: JSON.stringify(product.benefits),
      concerns: JSON.stringify(product.concerns),
    });
  }
});

seedCatalog(isDemoMode ? demoCatalogProducts : catalogProducts);

if (isDemoMode) {
  const products = db.prepare(`SELECT id, name, category, application_order, benefits_json, usage_note
    FROM catalog_products ORDER BY application_order, name`).all();
  const seedDemoState = db.transaction(() => {
    const addOwnedProduct = db.prepare('INSERT OR IGNORE INTO owned_products (product_id, expiry_date) VALUES (?, NULL)');
    for (const product of products) addOwnedProduct.run(product.id);

    // Remove the early local demo seed fingerprint if this database predates
    // the stable fingerprint below. This keeps the sample routine unique.
    db.prepare('DELETE FROM saved_routines WHERE fingerprint = ?').run('demo-sample-night-routine');
    const stepProducts = products.filter((product) => product.category !== 'sunscreen');
    const fingerprint = JSON.stringify(['night', '21:00', 5, ['dry skin'], stepProducts.map((product) => product.id)]);

    const routine = db.prepare(`INSERT OR IGNORE INTO saved_routines
      (title, period, preferred_time, uses_per_week, matched_concerns_json, fit_score, fingerprint)
      VALUES ('Nighttime routine', 'night', '21:00', 5, ?, 100, ?)`)
      .run(JSON.stringify(['dry skin']), fingerprint);
    if (routine.changes) {
      const routineId = Number(routine.lastInsertRowid);
      const addStep = db.prepare(`INSERT INTO routine_steps
        (routine_id, product_id, step_order, product_snapshot_json) VALUES (?, ?, ?, ?)`);
      stepProducts.forEach((product, index) => {
        addStep.run(routineId, product.id, index + 1, JSON.stringify({
          id: product.id,
          name: product.name,
          categoryLabel: product.category.replaceAll('_', ' '),
          purpose: JSON.parse(product.benefits_json).join('. '),
          usageNote: product.usage_note,
        }));
      });
    }
  });
  seedDemoState();
}
