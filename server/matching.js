import { findProducts } from './data-access.js';

const concernLabels = new Map([
  ['dry-skin', 'dry skin'], ['aging', 'aging skin'], ['fine-lines', 'fine lines'],
  ['rosacea', 'rosacea'], ['sun-damage', 'sun damage prevention'], ['dark-spots', 'dark spots'],
  ['uneven-tone', 'uneven tone'], ['blackheads', 'blackheads'], ['pores', 'pores'],
]);

export function buildSuggestions(input) {
  const { selectedConcernIds, selectedProductIds, period, preferredTime, usesPerWeek } = input;
  const allSelected = findProducts({ ids: selectedProductIds });
  const wrongTime = allSelected.filter((product) => product.usagePeriod && product.usagePeriod !== period);
  const selected = allSelected.filter((product) => !product.usagePeriod || product.usagePeriod === period);

  const matchedConcernIds = selectedConcernIds.filter((concernId) =>
    selected.some((product) => product.concerns.includes(concernId)),
  );
  const matchingProducts = selected.filter((product) =>
    product.concerns.some((concernId) => selectedConcernIds.includes(concernId))
      || (period === 'day' && product.category === 'sunscreen'),
  );

  if (selectedConcernIds.length === 0 || selectedProductIds.length === 0 || matchedConcernIds.length === 0) {
    return {
      options: [],
      message: selectedConcernIds.length === 0
        ? 'Choose at least one skin concern so we can explain why a product fits.'
        : selectedProductIds.length === 0
          ? 'Choose at least one product you own, then we can build from your shelf.'
          : 'None of the selected products list a match for those concerns yet. Try fewer concerns or different products.',
      timeExcludedProducts: wrongTime.map((product) => ({ id: product.id, name: product.name, usagePeriod: product.usagePeriod })),
    };
  }

  const score = Math.round((matchedConcernIds.length / selectedConcernIds.length) * 100);
  const products = matchingProducts.sort((a, b) => a.applicationOrder - b.applicationOrder);
  const fixedFrequencies = products.map((product) => product.usesPerWeek).filter((value) => value != null);
  const suggestedFrequency = fixedFrequencies.length > 0
    ? Math.min(...fixedFrequencies)
    : Number(usesPerWeek);
  const matchedLabels = matchedConcernIds.map((id) => concernLabels.get(id) || id);

  return {
    options: [{
      title: `${period === 'day' ? 'Daytime' : 'Nighttime'} routine`,
      period,
      timeLabel: preferredTime,
      usesPerWeek: suggestedFrequency,
      fitScore: score,
      matchedConcerns: matchedLabels,
      combinationStatus: 'not-assessed',
      excludedProducts: wrongTime.map((product) => ({ id: product.id, name: product.name, usagePeriod: product.usagePeriod })),
      steps: products.map((product, index) => ({
        id: product.id,
        order: index + 1,
        name: product.name,
        categoryLabel: product.categoryLabel,
        purpose: product.benefits.join('. '),
        usageNote: product.usageNote,
      })),
    }],
    message: null,
  };
}
