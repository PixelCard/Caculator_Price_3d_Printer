export function parseAmount(text) {
  const trimmed = text.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export function parseWholeNumber(text) {
  const trimmed = text.trim();
  if (!/^\d+$|^\d{1,3}(?:\.\d{3})+$|^\d{1,3}(?:,\d{3})+$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(/[.,]/g, ''));
  return Number.isSafeInteger(value) ? value : null;
}

export function parsePercentage(text) {
  const value = parseAmount(text.trim().replace(/%$/, ''));
  return value !== null && value <= 100 ? value : null;
}

export function calculatePrice({
  grams, filamentPrice, hours, powerWatts, electricityPerKwh, printerPrice,
  printerLifetimeHours, wastePercent, packaging, saleMultiplier,
}) {
  const filament = grams * (filamentPrice / 1000);
  const electricity = hours * (powerWatts / 1000) * electricityPerKwh;
  const machine = hours * (printerPrice / printerLifetimeHours);
  const subtotal = filament + electricity + machine;
  const waste = subtotal * (wastePercent / 100);
  const totalCost = subtotal + waste + packaging;
  const unroundedSalePrice = totalCost * saleMultiplier;
  // Remove floating-point noise around an exact rounding boundary.
  const salePrice = Math.ceil(Number((unroundedSalePrice / 1000).toPrecision(15))) * 1000;

  if (totalCost > Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(salePrice)) return null;
  return { filament, electricity, machine, waste, packaging, totalCost, unroundedSalePrice,
    salePrice, profit: salePrice - totalCost };
}
