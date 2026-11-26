import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateFoamPrice, foamInputIssues } from './foam-pricing.js';

const sample = {
  toolMinutes: 350, toolHourly: 20000,
  fineLength: 16, finePerMetre: 500, fineComplexity: 1.6, fineMaterial: 1.5,
  bladeLength: 0, bladePerMetre: 1000, bladeComplexity: 1.6, bladeMaterial: 1.5,
  laserMinutes: 60, laserReplacement: 14000000, laserRecoveryHours: 400,
  foilMinutes: 0, foilHourly: 0, laminatorMinutes: 30, laminatorHourly: 5000,
  foamSheets: 1, foamPerSheet: 55000, foamWaste: 10,
  paperSheets: 1.5, paperPerSheet: 11200, paperWaste: 10,
  matteLength: 2, mattePerMetre: 1100, matteWaste: 10,
  glueLength: 100, glueWidth: 30, glueFaces: 2, glueGramsPerSquareMetre: 100, gluePerGram: 60,
  toolWatts: 200, laminatorWatts: 500, electricityPerKwh: 5000,
  labourMinutes: 360, labourHourly: 20000, packaging: 20000, foilSupplies: 0, extraCosts: 30000, overhead: 0,
  marginPercent: 40, feePercent: 5,
};

test('reconciles the Foam & Paper sample without rounding its sale price', () => {
  const result = calculateFoamPrice(sample);
  assert.equal(result.laserHourly, 35000);
  assert.equal(result.totalCost.toFixed(2), '435450.00');
  assert.equal(result.salePrice.toFixed(2), '791727.27');
  assert.equal(result.salesFee.toFixed(2), '39586.36');
  assert.equal(result.profit.toFixed(2), '316690.91');
  assert.equal(result.actualMargin.toFixed(2), '40.00');
  assert.equal(result.costs.electricity[0].toFixed(2), '5833.33');
  assert.equal(result.costs.material[1].toFixed(2), '18480.00');
  assert.equal(calculateFoamPrice({ ...sample, paperSheets: 2 }).totalCost.toFixed(2), '441610.00');
});

test('handles unused laser, inconsistent run time and invalid pricing percentages', () => {
  const noLaser = calculateFoamPrice({ ...sample, laserMinutes: 0, laserRecoveryHours: 0 });
  assert.equal(noLaser.costs.machine[3], 0);
  assert.equal(calculateFoamPrice({ ...sample, laserRecoveryHours: 0 }), null);
  assert.ok(foamInputIssues({ ...sample, toolMinutes: 59 }).toolMinutes);
  assert.equal(calculateFoamPrice({ ...sample, feePercent: 60 }), null);
  assert.equal(calculateFoamPrice({ ...sample, foamSheets: null }), null);
});
