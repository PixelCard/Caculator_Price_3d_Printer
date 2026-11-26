import { parseAmount, parsePercentage, parseWholeNumber } from './pricing.js';

const printAliases = {
  grams: ['Nhựa tiêu hao', 'Khối lượng', 'Số gram'],
  powerWatts: ['Công suất trung bình', 'Công suất máy in'],
  electricityPerKwh: ['Đơn giá điện'],
  printerPrice: ['Giá mua máy', 'Giá máy'],
  printerLifetimeHours: ['Số giờ sử dụng ước tính', 'Số giờ sử dụng'],
  wastePercent: ['Mức dự phòng in hỏng', 'Tỉ lệ in lỗi', 'Tỷ lệ in hỏng'],
  packaging: ['Bao bì', 'Chi phí đóng gói'],
  saleMultiplier: ['Hệ số giá bán', 'Hệ số nhân'],
};

const foamAliases = {
  toolMinutes: ['T_xtool'],
  toolHourly: ['P_xtool'],
  fineLength: ['L_FPB'],
  finePerMetre: ['P_FPB'],
  fineComplexity: ['K_FPB'],
  fineMaterial: ['D_FPB'],
  bladeLength: ['L_CB'],
  bladePerMetre: ['P_CB'],
  bladeComplexity: ['K_CB'],
  bladeMaterial: ['D_CB'],
  laserMinutes: ['T_laser'],
  laserReplacement: ['G_laser'],
  laserRecoveryHours: ['H_thu_hoi'],
  foilMinutes: ['T_foil'],
  foilHourly: ['P_foil'],
  laminatorMinutes: ['T_can'],
  laminatorHourly: ['P_can'],
  foamSheets: ['N_EVA'],
  foamPerSheet: ['G_EVA'],
  foamWaste: ['R_EVA'],
  paperSheets: ['N_giay'],
  paperPerSheet: ['G_giay'],
  paperWaste: ['R_giay'],
  matteLength: ['L_matte'],
  mattePerMetre: ['P_matte'],
  matteWaste: ['R_matte'],
  glueLength: ['L_dan'],
  glueWidth: ['W_dan'],
  glueFaces: ['M'],
  glueGramsPerSquareMetre: ['G_keo'],
  gluePerGram: ['P_keo'],
  toolWatts: ['W_xtool'],
  laminatorWatts: ['W_can'],
  electricityPerKwh: ['P_dien', 'Đơn giá điện'],
  labourMinutes: ['T_cong'],
  labourHourly: ['P_cong'],
  packaging: ['C_dong_goi', 'Đóng gói'],
  foilSupplies: ['C_foil_vattu', 'Vật tư foil'],
  extraCosts: ['C_phat_sinh', 'Phụ phí phát sinh'],
  overhead: ['C_chung', 'Chi phí chung'],
  marginPercent: ['Margin mục tiêu', 'Margin', 'Tỷ lệ lãi mục tiêu'],
  feePercent: ['Phí bán hàng', 'Fee', 'Tỷ lệ phí bán hàng'],
};

const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  .replaceAll('đ', 'd').replace(/\s*\([^()]*\)\s*$/, '').replace(/[^a-z0-9]+/g, ' ').trim();
const integerFormat = new Intl.NumberFormat('vi-VN');
const decimalFormat = new Intl.NumberFormat('vi-VN', { useGrouping: false, maximumSignificantDigits: 16 });
const percentageCodes = new Set(['r eva', 'r giay', 'r matte']);

function parseCell(field, cell, label) {
  const { value, numFmt } = cell;
  const parse = field.parse ?? parseAmount;
  let amount;

  if (typeof value === 'number') {
    amount = value;
    if (parse === parsePercentage && (numFmt?.includes('%') || (percentageCodes.has(label) && value <= 1))) {
      amount *= 100;
    }
  } else if (typeof value === 'string') {
    let numericText = value.trim().replace(/\s*(?:vnđ|vnd|đ|₫)$/iu, '').trim();
    const unit = ` ${field.unit}`;
    if (parse !== parsePercentage && numericText.toLowerCase().endsWith(unit.toLowerCase())) {
      numericText = numericText.slice(0, -unit.length);
    }
    amount = parse(numericText);
    if (parse === parsePercentage && percentageCodes.has(label) && amount !== null && amount <= 1 && !numericText.endsWith('%')) {
      amount *= 100;
    }
  }

  if (!Number.isFinite(amount) || amount < 0 || (field.positive && amount === 0)) return null;
  if (parse === parseWholeNumber) return Number.isSafeInteger(amount) ? integerFormat.format(amount) : null;
  if (parse === parsePercentage && amount > 100) return null;
  return decimalFormat.format(Number(amount.toPrecision(15)));
}

function dimension(text) {
  const match = /^(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)(?:\s*cm)?$/iu.exec(text.trim());
  return match?.slice(1).every((value) => parseAmount(value) > 0) ? match.slice(1) : null;
}

function readSheet(sheet, fields, mode, aliases) {
  const inputs = {};
  const boxes = [];
  const invalid = new Set();
  const names = new Map();
  const duplicateLabels = new Set();
  for (const field of fields) {
    const name = normalize(field.label);
    if (names.has(name)) duplicateLabels.add(name);
    names.set(name, field);
  }
  for (const name of duplicateLabels) names.delete(name);
  for (const field of fields) {
    for (const alias of aliases[field.key] ?? []) names.set(normalize(alias), field);
  }

  let readingInputs = true;
  let boxColumns = null;
  let sawBoxHeader = false;
  let invalidBoxes = false;
  let boxQuantityIssue = null;
  let legacyPrint = false;
  let knife = null;
  sheet.eachRow((row) => {
    const cells = [];
    row.eachCell((cell, column) => {
      if (cell.isMerged && cell.master.address !== cell.address) return;
      cells.push({ column, value: cell.formula ? cell.result : cell.value, text: cell.text, numFmt: cell.numFmt });
    });
    if (!cells.length) return;
    const leading = normalize(cells[0].text);
    if (/bang tinh gia in 3d$/.test(leading)) legacyPrint = true;
    if (/^(?:(?:\d+ )*ket qua|chi tiet tinh tien|chi phi chi tiet)/.test(leading)) readingInputs = false;
    if (/thong so (?:nhap|tinh gia)|bang bien dau vao/.test(leading)) readingInputs = true;

    if (mode === 'foam') {
      const headers = cells.map(({ text }) => normalize(text));
      const headerColumns = [
        headers.findIndex((text) => ['box', 'ten box'].includes(text)),
        headers.findIndex((text) => ['sheet foam', 'kich thuoc foam'].includes(text)),
        headers.findIndex((text) => ['sheet paper', 'kich thuoc giay'].includes(text)),
        headers.findIndex((text) => ['part', 'so chi tiet', 'so chi tiet moi box'].includes(text)),
      ];
      if (headerColumns.every((index) => index >= 0)) {
        sawBoxHeader = true;
        const quantityIndex = headers.findIndex((text) => text === 'so box giong nhau');
        if (quantityIndex === -1) {
          boxQuantityIssue = 'missing-column';
          boxColumns = null;
        } else {
          boxColumns = [...headerColumns, quantityIndex].map((index) => cells[index].column);
        }
        return;
      }
      if (boxColumns) {
        const [name, foam, paper, parts, quantityCell] = boxColumns.map((column) => cells.find((cell) => cell.column === column));
        if (name?.text && (foam || paper || parts || quantityCell)) {
          const foamSize = dimension(foam?.text ?? '');
          const paperSize = dimension(paper?.text ?? '');
          const count = parseWholeNumber(parts?.text ?? '');
          const quantity = typeof quantityCell?.value === 'number'
            ? quantityCell.value : parseWholeNumber(quantityCell?.text ?? '');
          const validQuantity = Number.isSafeInteger(quantity) && quantity > 0;
          if (!validQuantity) boxQuantityIssue ??= 'invalid-value';
          if (!foamSize || !paperSize || count === null) invalidBoxes = true;
          else if (validQuantity) {
            boxes.push({ name: name.text, foamLength: foamSize[0], foamWidth: foamSize[1],
              paperLength: paperSize[0], paperWidth: paperSize[1], quantity: String(quantity), parts: String(count) });
          }
          return;
        }
        boxColumns = null;
      }
      if (leading.includes('fine point blade')) knife = 'fine';
      if (leading.includes('cutting blade')) knife = 'blade';
    }

    function record(field, cell, label) {
      if (!field || Object.hasOwn(inputs, field.key)) return;
      if (!readingInputs && !['marginPercent', 'feePercent'].includes(field.key)) return;
      if (!cell || cell.value == null || cell.value === '') return;
      const value = parseCell(field, cell, label);
      if (value === null) invalid.add(field.key);
      else {
        inputs[field.key] = value;
        invalid.delete(field.key);
      }
    }

    for (const [index, cell] of cells.entries()) {
      const label = normalize(cell.text);
      let field = names.get(label);
      if (!field && knife) {
        const suffix = { 'chieu dai cat': 'Length', 'hao mon dao': 'PerMetre',
          'he so duong cat': 'Complexity', 'he so vat lieu': 'Material' }[label];
        if (suffix) field = fields.find(({ key }) => key === knife + suffix);
      }
      record(field, cells[index + 1], label);

      if (mode === 'foam' && typeof cell.value === 'string' && /[:=]/.test(cell.value)) {
        const parts = cell.value.split(/\s*[—;]\s*/);
        for (const part of parts) {
          const inline = /^\s*\*?\s*(.+?)\s*[:=]\s*([^()]+)\s*$/u.exec(part.replace(/\s*\([^()]*\)\.?\s*$/, ''));
          if (!inline) continue;
          const inlineLabel = normalize(inline[1]);
          record(names.get(inlineLabel), { value: inline[2].trim() }, inlineLabel);
        }
      }
    }
  });

  if (mode === 'print' && legacyPrint && !invalid.has('packaging')
      && fields.every(({ key }) => key === 'packaging' || Object.hasOwn(inputs, key))) {
    inputs.packaging ??= '0';
  }
  return { inputs, boxes, sawBoxHeader, invalidBoxes, boxQuantityIssue, invalidCount: invalid.size, sheet: sheet.name };
}

export function importWorkbook(workbook, fields, mode) {
  const aliases = mode === 'foam' ? foamAliases : printAliases;
  const reports = workbook.worksheets.map((sheet) => readSheet(sheet, fields, mode, aliases));
  const best = reports.sort((a, b) => Object.keys(b.inputs).length - Object.keys(a.inputs).length)[0];
  if (!best) return null;
  const boxReport = best.sawBoxHeader ? best : reports.find((report) => report.sawBoxHeader);
  const invalidBoxes = boxReport?.invalidBoxes;
  const boxQuantityIssue = boxReport?.boxQuantityIssue;
  const boxes = invalidBoxes || boxQuantityIssue ? [] : boxReport?.boxes ?? [];
  if (!Object.keys(best.inputs).length && !boxes.length && !best.invalidCount && !invalidBoxes && !boxQuantityIssue) return null;
  return { inputs: best.inputs, boxes, sheet: best.sheet, invalidCount: best.invalidCount, invalidBoxes, boxQuantityIssue };
}
