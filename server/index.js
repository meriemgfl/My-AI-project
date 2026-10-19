import express from 'express';
import { addInventoryProduct, findProducts, getExpiredProductIds, getInventory, getOwnedProductIds, getProfile, getSavedRoutine, listSavedRoutines, removeInventoryProduct, saveProfile, saveSuggestedRoutine } from './data-access.js';
import { isDemoMode } from './db.js';
import { buildSuggestions } from './matching.js';

const app = express();
const port = Number(process.env.PORT || 3001);
app.use(express.json());

app.get('/api/health', (_request, response) => response.json({ status: 'ok', demoMode: isDemoMode }));
app.get('/api/products', (request, response) => {
  response.json({ products: findProducts({ query: String(request.query.q || '') }) });
});
app.get('/api/inventory', (_request, response) => response.json({ products: getInventory() }));
app.post('/api/inventory', (request, response) => {
  const { productId, expiryDate = null } = request.body ?? {};
  if (!Number.isInteger(productId) || !findProducts({ ids: [productId] }).length) {
    return response.status(400).json({ error: 'Choose a product from the catalog.' });
  }
  if (expiryDate !== null && (typeof expiryDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) || Number.isNaN(Date.parse(`${expiryDate}T00:00:00Z`)) || new Date(`${expiryDate}T00:00:00Z`).toISOString().slice(0, 10) !== expiryDate)) {
    return response.status(400).json({ error: 'Enter a valid expiry date or leave it blank.' });
  }
  return response.status(201).json({ product: addInventoryProduct(productId, expiryDate) });
});
app.delete('/api/inventory/:productId', (request, response) => {
  const productId = Number(request.params.productId);
  if (!Number.isInteger(productId)) return response.status(400).json({ error: 'Choose a valid product.' });
  removeInventoryProduct(productId);
  return response.status(204).end();
});
app.get('/api/profile', (_request, response) => response.json({ profile: getProfile() }));
app.put('/api/profile', (request, response) => {
  const { selectedConcernIds, period, preferredTime, usesPerWeek } = request.body ?? {};
  const validTime = typeof preferredTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime);
  if (!Array.isArray(selectedConcernIds) || selectedConcernIds.some((id) => typeof id !== 'string') || !(period === 'day' || period === 'night') || !validTime || !Number.isInteger(usesPerWeek) || usesPerWeek < 1 || usesPerWeek > 7) {
    return response.status(400).json({ error: 'Check your profile preferences and try again.' });
  }
  return response.json({ profile: saveProfile({ selectedConcernIds, period, preferredTime, usesPerWeek }) });
});

app.get('/api/routines', (_request, response) => response.json({ routines: listSavedRoutines() }));
app.get('/api/routines/:routineId', (request, response) => {
  const id = Number(request.params.routineId);
  if (!Number.isInteger(id) || id < 1) return response.status(400).json({ error: 'Choose a valid routine.' });
  const routine = getSavedRoutine(id);
  if (!routine) return response.status(404).json({ error: 'That saved routine could not be found.' });
  return response.json({ routine });
});
app.post('/api/routines', (request, response) => {
  const { selectedConcernIds, selectedProductIds, period, preferredTime, usesPerWeek } = request.body ?? {};
  const validPeriod = period === 'day' || period === 'night';
  const validTime = typeof preferredTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime);
  const validFrequency = Number.isInteger(usesPerWeek) && usesPerWeek >= 1 && usesPerWeek <= 7;
  if (!Array.isArray(selectedConcernIds) || selectedConcernIds.some((id) => typeof id !== 'string') || !Array.isArray(selectedProductIds) || selectedProductIds.some((id) => !Number.isInteger(id)) || !validPeriod || !validTime || !validFrequency) {
    return response.status(400).json({ error: 'Review your routine choices and try again.' });
  }
  const expired = new Set(getExpiredProductIds());
  const owned = new Set(getOwnedProductIds());
  const eligibleProductIds = selectedProductIds.filter((id) => owned.has(id) && !expired.has(id));
  const suggestion = buildSuggestions({ selectedConcernIds, selectedProductIds: eligibleProductIds, period, preferredTime, usesPerWeek });
  if (!suggestion.options.length) return response.status(422).json({ error: suggestion.message || 'There is no routine to save yet.' });
  saveProfile({ selectedConcernIds, period, preferredTime, usesPerWeek });
  return response.status(201).json({ routine: saveSuggestedRoutine(suggestion.options[0]) });
});

app.post('/api/suggestions', (request, response) => {
  const { selectedConcernIds, selectedProductIds, period, preferredTime, usesPerWeek } = request.body ?? {};
  const validPeriod = period === 'day' || period === 'night';
  const validTime = typeof preferredTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime);
  const validFrequency = Number.isInteger(usesPerWeek) && usesPerWeek >= 1 && usesPerWeek <= 7;
  if (!Array.isArray(selectedConcernIds) || !Array.isArray(selectedProductIds) || !validPeriod || !validTime || !validFrequency) {
    return response.status(400).json({ error: 'Choose concerns and products, a day or night routine, a valid time, and 1–7 days per week.' });
  }
  if (selectedProductIds.some((id) => !Number.isInteger(id))) {
    return response.status(400).json({ error: 'The selected product list contains an invalid item.' });
  }
  saveProfile({ selectedConcernIds, period, preferredTime, usesPerWeek });
  const expired = new Set(getExpiredProductIds());
  const owned = new Set(getOwnedProductIds());
  const eligibleProductIds = selectedProductIds.filter((id) => owned.has(id) && !expired.has(id));
  return response.json(buildSuggestions({ selectedConcernIds, selectedProductIds: eligibleProductIds, period, preferredTime, usesPerWeek }));
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'The local app could not complete that request. Please retry.' });
});

app.listen(port, () => console.log(`Skincare API listening at http://localhost:${port}`));
