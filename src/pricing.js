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
  printerLifetimeHours, wastePercent, packaging, saleMultiplier, isShopee = false,
}) {
  const filament = grams * (filamentPrice / 1000);
  const electricity = hours * (powerWatts / 1000) * electricityPerKwh;
  const machine = hours * (printerPrice / printerLifetimeHours);
  const subtotal = filament + electricity + machine;
  const waste = subtotal * (wastePercent / 100);
  const baseCost = subtotal + waste + packaging;
  if (isShopee && exceedsShopeeMultiplierLimit(saleMultiplier)) return null;

  // Solve price = multiplier × (base cost + fixed fees + rate × price).
  const unroundedSalePrice = isShopee
    ? ((baseCost + shopeeFixed) * saleMultiplier) / (1 - shopeeRate * saleMultiplier)
    : baseCost * saleMultiplier;
  // Remove floating-point noise around an exact rounding boundary.
  const salePrice = Math.ceil(Number((unroundedSalePrice / 1000).toPrecision(15))) * 1000;
  const fees = isShopee ? calculateShopeeFees(salePrice) : [];
  const totalCost = baseCost + fees.reduce((total, amount) => total + amount, 0);

  if (totalCost > Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(salePrice)) return null;
  return { filament, electricity, machine, waste, packaging, fees, totalCost, unroundedSalePrice,
    salePrice, profit: salePrice - totalCost };
}
export const shopeeFees = [
  { label: 'Phí xử lý giao dịch', basisPoints: 600 },
  { label: 'Phí cố định', basisPoints: 1600 },
  { label: 'Phí hạ tầng', fixed: 3000 },
  { label: 'Thuế GTGT', basisPoints: 100 },
  { label: 'Thuế TNCN', basisPoints: 50 },
];
export const shopeeRate = shopeeFees.reduce((total, fee) => total + (fee.basisPoints ?? 0), 0) / 10000;
export const shopeeFixed = shopeeFees.reduce((total, fee) => total + (fee.fixed ?? 0), 0);

export function calculateShopeeFees(salePrice) {
  return shopeeFees.map(({ basisPoints, fixed }) => fixed ?? (salePrice * basisPoints) / 10000);
}

export function exceedsShopeeMultiplierLimit(multiplier) {
  return multiplier >= 1 / shopeeRate;
}

