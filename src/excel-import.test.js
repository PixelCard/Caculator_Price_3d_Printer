import assert from 'node:assert/strict';
import { test } from 'node:test';
import ExcelJS from 'exceljs';
import { importWorkbook } from './excel-import.js';
import { parsePercentage, parseWholeNumber } from './pricing.js';

test('imports Excel percentages and skips the print results section', async () => {
  const sheetBook = new ExcelJS.Workbook();
  const sheet = sheetBook.addWorksheet('In 3D');
  sheet.addRow(['Thông số nhập', 'Giá trị']);
  sheet.addRow(['Khối lượng sản phẩm (gam)', 8]);
  sheet.addRow(['Tỉ lệ in hỏng (%)', 0.1]).getCell(2).numFmt = '0%';
  sheet.addRow(['KẾT QUẢ']);
  sheet.addRow(['Bao bì', { formula: '10+20', result: 30 }]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await sheetBook.xlsx.writeBuffer());
  const result = importWorkbook(workbook, [
    { key: 'grams', label: 'Khối lượng sản phẩm' },
    { key: 'wastePercent', label: 'Tỉ lệ in hỏng', parse: parsePercentage },
    { key: 'packaging', label: 'Bao bì, đóng gói', parse: parseWholeNumber },
  ], 'print');
  assert.deepEqual(result.inputs, { grams: '8', wastePercent: '10' });
});

test('imports Foam variable codes, inline laser inputs, margin and the Box table', () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Foam');
  sheet.addRow(['Box', 'Sheet Foam (cm)', 'Sheet Paper (cm)', 'Số Box giống nhau', 'Part', 'Ghi chú']);
  sheet.addRow(['No 1', '30 x 30', '30 × 30', 2, 14, 'Box No 1 - 30 x 30 x9c']);
  sheet.addRow(['Bảng biến đầu vào']);
  sheet.addRow(['L_EVA', 120]);
  sheet.addRow(['W_EVA', '100 cm']);
  sheet.addRow(['N_EVA', 99]);
  sheet.addRow(['L_giay', 120]);
  sheet.addRow(['W_giay', '100 cm']);
  sheet.addRow(['N_giay', 99]);
  sheet.addRow(['R_giay', '0,10']);
  sheet.addRow(['* G_laser = 14.000.000 VNĐ (giá thay module Laser 20W).']);
  sheet.addRow(['* H_thu_hoi = 400 giờ (mục tiêu tích lũy đủ tiền thay module).']);
  sheet.addRow(['KẾT QUẢ TÍNH GIÁ VỐN']);
  sheet.addRow(['Margin mục tiêu: 40% — Fee: 5%']);
  const result = importWorkbook(workbook, [
    { key: 'foamStockLength', label: 'Chiều dài tấm foam gốc', unit: 'cm', positive: true },
    { key: 'foamStockWidth', label: 'Chiều rộng tấm foam gốc', unit: 'cm', positive: true },
    { key: 'paperStockLength', label: 'Chiều dài tờ giấy gốc', unit: 'cm', positive: true },
    { key: 'paperStockWidth', label: 'Chiều rộng tờ giấy gốc', unit: 'cm', positive: true },
    { key: 'paperWaste', label: 'Hao hụt giấy', parse: parsePercentage },
    { key: 'laserReplacement', label: 'Giá thay module laser', unit: 'đ', parse: parseWholeNumber },
    { key: 'laserRecoveryHours', label: 'Số giờ thu hồi chi phí module', unit: 'giờ' },
    { key: 'marginPercent', label: 'Tỉ lệ lãi mục tiêu', parse: parsePercentage },
    { key: 'feePercent', label: 'Tỉ lệ phí bán hàng', parse: parsePercentage },
  ], 'foam');

  assert.deepEqual(result.inputs, {
    foamStockLength: '120', foamStockWidth: '100',
    paperStockLength: '120', paperStockWidth: '100', paperWaste: '10', laserReplacement: '14.000.000',
    laserRecoveryHours: '400', marginPercent: '40', feePercent: '5',
  });
  assert.deepEqual(result.boxes, [{
    name: 'No 1', foamLength: '30', foamWidth: '30', paperLength: '30',
    paperWidth: '30', quantity: '2', parts: '14',
  }]);
});

test('requires the Box quantity column and rejects invalid quantities', () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Box');
  sheet.addRow(['Box', 'Sheet Foam (cm)', 'Sheet Paper (cm)', 'Part', 'Ghi chú']);
  sheet.addRow(['No 1', '30 x 30', '30 x 30', 14, 'x2c']);
  const missing = importWorkbook(workbook, [], 'foam');
  assert.equal(missing.boxQuantityIssue, 'missing-column');
  assert.deepEqual(missing.boxes, []);

  sheet.getCell('F1').value = 'Số Box giống nhau';
  for (const value of [null, 0, -1, 1.5, 'ABC']) {
    sheet.getCell('F2').value = value;
    const invalid = importWorkbook(workbook, [], 'foam');
    assert.equal(invalid.boxQuantityIssue, 'invalid-value');
    assert.deepEqual(invalid.boxes, []);
  }
});
