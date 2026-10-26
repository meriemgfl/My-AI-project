async function request(path, options) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
  return body;
}

export const getProducts = () => request('/api/products');
export const getHealth = () => request('/api/health');
export const getInventory = () => request('/api/inventory');
export const getProfile = () => request('/api/profile');
export const saveProfile = (profile) => request('/api/profile', { method: 'PUT', body: JSON.stringify(profile) });
export const addInventoryProduct = (productId, expiryDate) => request('/api/inventory', {
  method: 'POST', body: JSON.stringify({ productId, expiryDate: expiryDate || null }),
});
export const removeInventoryProduct = (productId) => request(`/api/inventory/${productId}`, { method: 'DELETE' });
export const getRoutines = () => request('/api/routines');
export const getRoutine = (routineId, date, weekStart) => request(`/api/routines/${routineId}?date=${date}&weekStart=${weekStart}`);
export const setRoutineStepCompletion = (routineId, stepId, date, weekStart, completed) => request(`/api/routines/${routineId}/checklist`, { method: 'PUT', body: JSON.stringify({ stepId, date, weekStart, completed }) });
export const saveRoutine = (answers) => request('/api/routines', { method: 'POST', body: JSON.stringify(answers) });
export const updateRoutine = (routineId, answers) => request(`/api/routines/${routineId}`, { method: 'PUT', body: JSON.stringify(answers) });
export const removeSavedRoutine = (routineId) => request(`/api/routines/${routineId}`, { method: 'DELETE' });
export const getSuggestion = (answers) => request('/api/suggestions', {
  method: 'POST',
  body: JSON.stringify(answers),
});
