import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateSheets } from './sheet-packing.js';

test('fits the six sample Box designs on one 120 × 100 cm sheet', () => {
  const boxes = [30, 22, 15, 22, 20, 20].map((width, index) => ({
    length: 30, width, quantity: index === 0 ? 2 : 1,
  }));
  assert.deepEqual(estimateSheets(120, 100, boxes), { sheets: 1 });
});

test('honours the shape of the stock, rotation, decimal dimensions and large quantities', () => {
  assert.deepEqual(estimateSheets(100, 100, [{ length: 60, width: 60, quantity: 2 }]), { sheets: 2 });
  assert.deepEqual(estimateSheets(100, 120, [{ length: 120, width: 100, quantity: 1 }]), { sheets: 1 });
  assert.deepEqual(estimateSheets(0.3, 0.3, [{ length: 0.1, width: 0.1, quantity: 9 }]), { sheets: 1 });
  assert.deepEqual(estimateSheets(100, 100, [{ length: 100, width: 100, quantity: 3000000000 }]), { sheets: 3000000000 });
});

test('requires stock and valid Box dimensions and identifies a piece that cannot fit', () => {
  assert.deepEqual(estimateSheets(120, 100, []), { sheets: null });
  const box = { name: 'No 3', length: 121, width: 80, quantity: 1 };
  assert.deepEqual(estimateSheets(120, 100, [box]), { sheets: null, issue: 'oversize', box: 'No 3' });
  assert.deepEqual(estimateSheets(120, 100, [{ ...box, length: 30, quantity: null }]),
    { sheets: null, issue: 'incomplete', box: 'No 3' });
});
