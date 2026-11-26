import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculatePrice, parseAmount, parsePercentage, parseWholeNumber } from './pricing.js';

const example = {
  grams: 8, filamentPrice: 150000, hours: 1, powerWatts: 100,
  electricityPerKwh: 3000, printerPrice: 10_000_000, printerLifetimeHours: 5000,
  wastePercent: 10, packaging: 0, saleMultiplier: 3,
};

test('uses all ten inputs and computes profit from the rounded selling price', () => {
  assert.deepEqual(calculatePrice(example), {
    filament: 1200, electricity: 300, machine: 2000, waste: 350, packaging: 0,
    totalCost: 3850, unroundedSalePrice: 11550, salePrice: 12000, profit: 8150,
  });
  assert.deepEqual(calculatePrice({
    grams: 20, filamentPrice: 200000, hours: 2, powerWatts: 150,
    electricityPerKwh: 4000, printerPrice: 12_000_000, printerLifetimeHours: 6000,
    wastePercent: 5, packaging: 500, saleMultiplier: 2.5,
  }), {
    filament: 4000, electricity: 1200, machine: 4000, waste: 460, packaging: 500,
    totalCost: 10160, unroundedSalePrice: 25400, salePrice: 26000, profit: 15840,
  });
  assert.equal(calculatePrice({ ...example, grams: 100, filamentPrice: 100000, hours: 0 }).salePrice, 33000);
  assert.equal(calculatePrice({ ...example, grams: 0, hours: 0 }).salePrice, 0);
  assert.equal(calculatePrice({ ...example, saleMultiplier: 0.5 }).profit, -1850);
});

test('accepts the Excel money and percentage formats and Vietnamese decimals', () => {
  assert.equal(parseAmount('0,5'), 0.5);
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('-1'), null);
  assert.equal(parseWholeNumber('150.000'), 150000);
  assert.equal(parseWholeNumber('10,000,000'), 10000000);
  assert.equal(parseWholeNumber('5,000'), 5000);
  assert.equal(parseWholeNumber('150.00'), null);
  assert.equal(parsePercentage('10%'), 10);
  assert.equal(parsePercentage('100,5'), null);
});
