export const assumptions = {
  powerWatts: 100,
  electricityPerKwh: 3000,
  printerPrice: 10_000_000,
  printerLifetimeHours: 5000,
  wasteRate: 0.1,
  saleMultiplier: 3,
  roundingStep: 1000,
};

export function parseAmount(text) {
  const trimmed = text.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export function parseFilamentPrice(text) {
  const trimmed = text.trim();
  if (!/^\d+$|^\d{1,3}(?:\.\d{3})+$/.test(trimmed)) return null;
  const value = Number(trimmed.replaceAll('.', ''));
  return Number.isSafeInteger(value) ? value : null;
}

export function calculatePrice(grams, filamentPerKg, hours) {
  const filament = grams * (filamentPerKg / 1000);
  const electricity = hours * (assumptions.powerWatts / 1000) * assumptions.electricityPerKwh;
  const machine = hours * (assumptions.printerPrice / assumptions.printerLifetimeHours);
  const subtotal = filament + electricity + machine;
  const waste = subtotal * assumptions.wasteRate;
  const printingCost = subtotal + waste;
  const unroundedSalePrice = printingCost * assumptions.saleMultiplier;
  const step = assumptions.roundingStep;
  // Remove floating-point noise around an exact rounding boundary.
  const salePrice = Math.ceil(Number((unroundedSalePrice / step).toPrecision(15))) * step;

  if (!Number.isSafeInteger(salePrice)) return null;
  return { filament, electricity, machine, subtotal, waste, printingCost, unroundedSalePrice, salePrice };
}
