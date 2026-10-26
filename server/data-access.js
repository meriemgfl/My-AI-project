import { db } from './db.js';

function toProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    category: row.category,
    categoryLabel: row.category.replaceAll('_', ' '),
    ingredients: row.ingredients,
    estimatedPrice: row.estimated_price,
    currency: row.currency,
    priceLabel: row.estimated_price == null ? 'price pending' : `$${row.estimated_price.toFixed(2)}`,
    benefits: JSON.parse(row.benefits_json),
    concerns: JSON.parse(row.concerns_json),
    usagePeriod: row.usage_period,
    usesPerWeek: row.uses_per_week,
    applicationOrder: row.application_order,
    usageNote: row.usage_note,
    sourceUrl: row.source_url,
    combinationNotes: JSON.parse(row.combination_notes_json),
  };
}

export function findProducts({ query = '', ids = null } = {}) {
  if (ids) {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const rows = db.prepare(`SELECT * FROM catalog_products WHERE id IN (${placeholders}) ORDER BY application_order, name`).all(...ids);
    return rows.map(toProduct);
  }

  const normalizedQuery = query.trim();
  const rows = normalizedQuery
    ? db.prepare(`SELECT * FROM catalog_products WHERE name LIKE ? OR brand LIKE ? ORDER BY application_order, name`)
      .all(`%${normalizedQuery}%`, `%${normalizedQuery}%`)
    : db.prepare('SELECT * FROM catalog_products ORDER BY application_order, name').all();
  return rows.map(toProduct);
}

export function getInventory() {
  return db.prepare(`
    SELECT p.*, o.expiry_date, o.added_at
    FROM owned_products o JOIN catalog_products p ON p.id = o.product_id
    ORDER BY p.application_order, p.name
  `).all().map((row) => ({ ...toProduct(row), expiryDate: row.expiry_date, addedAt: row.added_at }));
}

export function getExpiredProductIds(today = new Date().toISOString().slice(0, 10)) {
  return db.prepare('SELECT product_id FROM owned_products WHERE expiry_date IS NOT NULL AND expiry_date < ?')
    .all(today).map((row) => row.product_id);
}

export function getOwnedProductIds() {
  return db.prepare('SELECT product_id FROM owned_products').all().map((row) => row.product_id);
}

export function addInventoryProduct(productId, expiryDate) {
  db.prepare(`INSERT INTO owned_products (product_id, expiry_date) VALUES (?, ?)
    ON CONFLICT(product_id) DO UPDATE SET expiry_date = excluded.expiry_date`).run(productId, expiryDate);
  return getInventory().find((product) => product.id === productId);
}

export function removeInventoryProduct(productId) {
  return db.prepare('DELETE FROM owned_products WHERE product_id = ?').run(productId).changes > 0;
}

export function getProfile() {
  const row = db.prepare('SELECT * FROM profile_preferences WHERE id = 1').get();
  return {
    selectedConcernIds: JSON.parse(row.selected_concerns_json),
    period: row.period,
    preferredTime: row.preferred_time,
    usesPerWeek: row.uses_per_week,
  };
}

export function saveProfile({ selectedConcernIds, period, preferredTime, usesPerWeek }) {
  db.prepare(`UPDATE profile_preferences SET selected_concerns_json = ?, period = ?, preferred_time = ?, uses_per_week = ? WHERE id = 1`)
    .run(JSON.stringify(selectedConcernIds), period, preferredTime, usesPerWeek);
  return getProfile();
}

function toRoutine(row) {
  return {
    id: row.id,
    title: row.title,
    period: row.period,
    preferredTime: row.preferred_time,
    usesPerWeek: row.uses_per_week,
    matchedConcerns: JSON.parse(row.matched_concerns_json),
    fitScore: row.fit_score,
    stepCount: row.step_count,
    createdAt: row.created_at,
  };
}

export function listSavedRoutines() {
  return db.prepare(`
    SELECT r.*, (SELECT COUNT(*) FROM routine_steps s WHERE s.routine_id = r.id) AS step_count
    FROM saved_routines r ORDER BY r.created_at DESC, r.id DESC
  `).all().map(toRoutine);
}

export function getSavedRoutine(id, completedOn = null, weekStart = null) {
  const row = db.prepare(`
    SELECT r.*, (SELECT COUNT(*) FROM routine_steps s WHERE s.routine_id = r.id) AS step_count
    FROM saved_routines r WHERE r.id = ?
  `).get(id);
  if (!row) return null;
  const routine = toRoutine(row);
  routine.steps = db.prepare(`
    SELECT id, product_id, step_order, product_snapshot_json
    FROM routine_steps WHERE routine_id = ? ORDER BY step_order
  `).all(id).map((step) => ({
    ...JSON.parse(step.product_snapshot_json),
    id: step.product_id ?? JSON.parse(step.product_snapshot_json).id,
    stepId: step.id,
    order: step.step_order,
  }));
  routine.checklistDate = completedOn;
  routine.weekStart = weekStart;
  routine.completedDays = weekStart
    ? db.prepare(`SELECT c.completed_on FROM routine_step_completions c
        JOIN routine_steps s ON s.id = c.step_id
        WHERE s.routine_id = ? AND c.completed_on >= ? AND c.completed_on < date(?, '+7 days')
        GROUP BY c.completed_on
        HAVING COUNT(DISTINCT c.step_id) = ? ORDER BY c.completed_on`).all(id, weekStart, weekStart, row.step_count).map((entry) => entry.completed_on)
    : [];
  routine.completedStepIds = completedOn
    ? db.prepare(`SELECT c.step_id FROM routine_step_completions c
        JOIN routine_steps s ON s.id = c.step_id
        WHERE s.routine_id = ? AND c.completed_on = ?`).all(id, completedOn).map((entry) => entry.step_id)
    : [];
  return routine;
}

export function setRoutineStepCompletion(routineId, stepId, completedOn, completed) {
  const step = db.prepare('SELECT id FROM routine_steps WHERE id = ? AND routine_id = ?').get(stepId, routineId);
  if (!step) return false;
  if (completed) {
    db.prepare(`INSERT OR IGNORE INTO routine_step_completions (step_id, completed_on) VALUES (?, ?)`)
      .run(stepId, completedOn);
  } else {
    db.prepare('DELETE FROM routine_step_completions WHERE step_id = ? AND completed_on = ?')
      .run(stepId, completedOn);
  }
  return true;
}

export function saveSuggestedRoutine(suggestion) {
  const fingerprint = JSON.stringify([
    suggestion.period,
    suggestion.timeLabel,
    suggestion.usesPerWeek,
    suggestion.matchedConcerns,
    suggestion.steps.map((step) => step.id),
  ]);
  const existing = db.prepare('SELECT id FROM saved_routines WHERE fingerprint = ?').get(fingerprint);
  if (existing) return getSavedRoutine(existing.id);

  const insertRoutine = db.prepare(`
    INSERT INTO saved_routines (title, period, preferred_time, uses_per_week, matched_concerns_json, fit_score, fingerprint)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertStep = db.prepare(`
    INSERT INTO routine_steps (routine_id, product_id, step_order, product_snapshot_json)
    VALUES (?, ?, ?, ?)
  `);
  const persist = db.transaction(() => {
    const result = insertRoutine.run(
      suggestion.title,
      suggestion.period,
      suggestion.timeLabel,
      suggestion.usesPerWeek,
      JSON.stringify(suggestion.matchedConcerns),
      suggestion.fitScore,
      fingerprint,
    );
    for (const step of suggestion.steps) {
      insertStep.run(result.lastInsertRowid, step.id, step.order, JSON.stringify(step));
    }
    return Number(result.lastInsertRowid);
  });
  return getSavedRoutine(persist());
}


export function updateSavedRoutine(id, suggestion) {
  if (!db.prepare('SELECT id FROM saved_routines WHERE id = ?').get(id)) return { notFound: true };
  const fingerprint = JSON.stringify([suggestion.period, suggestion.timeLabel, suggestion.usesPerWeek, suggestion.matchedConcerns, suggestion.steps.map((step) => step.id)]);
  const duplicate = db.prepare('SELECT id FROM saved_routines WHERE fingerprint = ? AND id <> ?').get(fingerprint, id);
  if (duplicate) return { duplicate: true };
  const updateRoutine = db.prepare('UPDATE saved_routines SET title = ?, period = ?, preferred_time = ?, uses_per_week = ?, matched_concerns_json = ?, fit_score = ?, fingerprint = ? WHERE id = ?');
  const removeSteps = db.prepare('DELETE FROM routine_steps WHERE routine_id = ?');
  const insertStep = db.prepare('INSERT INTO routine_steps (routine_id, product_id, step_order, product_snapshot_json) VALUES (?, ?, ?, ?)');
  const update = db.transaction(() => {
    updateRoutine.run(suggestion.title, suggestion.period, suggestion.timeLabel, suggestion.usesPerWeek, JSON.stringify(suggestion.matchedConcerns), suggestion.fitScore, fingerprint, id);
    removeSteps.run(id);
    for (const step of suggestion.steps) insertStep.run(id, step.id, step.order, JSON.stringify(step));
  });
  update();
  return { routine: getSavedRoutine(id) };
}

export function deleteSavedRoutine(id) {
  return db.prepare('DELETE FROM saved_routines WHERE id = ?').run(id).changes > 0;
}
