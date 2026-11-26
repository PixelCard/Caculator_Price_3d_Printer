import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculatePrice, parseAmount, parseFilamentPrice } from './pricing.js';

test('calculates the keychain example and recalculates when inputs change', () => {
  assert.deepEqual(calculatePrice(8, 150000, 1), {
    filament: 1200, electricity: 300, machine: 2000, subtotal: 3500, waste: 350,
    printingCost: 3850, unroundedSalePrice: 11550, salePrice: 12000,
  });
  const changed = calculatePrice(10, 200000, parseAmount('0,5'));
  assert.equal(changed.printingCost, 3465);
  assert.equal(changed.salePrice, 11000);
  assert.equal(calculatePrice(100, 100000, 0).salePrice, 33000);
  assert.equal(calculatePrice(0, 0, 0).salePrice, 0);
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('-1'), null);
  assert.equal(parseAmount('150.000,5'), null);
  assert.equal(parseFilamentPrice('150.000'), 150000);
  assert.equal(parseFilamentPrice('150000'), 150000);
  assert.equal(parseFilamentPrice('150.00'), null);
});
