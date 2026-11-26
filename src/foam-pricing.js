import { calculateShopeeFees, shopeeFixed, shopeeRate } from './pricing.js';

export function foamInputIssues(values, isShopee = false) {
  const issues = {};
  const { toolMinutes, laserMinutes, foilMinutes, laserRecoveryHours, marginPercent, feePercent } = values;

  if ([toolMinutes, laserMinutes, foilMinutes].every(Number.isFinite)
      && laserMinutes + foilMinutes > toolMinutes) {
    issues.toolMinutes = 'Thời gian xTool phải bao gồm tổng thời gian chạy laser và foil.';
  }
  if (laserMinutes > 0 && laserRecoveryHours === 0) {
    issues.laserRecoveryHours = 'Nhập số giờ thu hồi lớn hơn 0 khi có chạy laser.';
  }
  if (isShopee && Number.isFinite(marginPercent) && marginPercent >= 100 - shopeeRate * 100) {
    issues.marginPercent = 'Tỉ lệ lãi mục tiêu cộng tổng % phí Shopee phải nhỏ hơn 100%.';
  } else if (!isShopee && Number.isFinite(marginPercent) && Number.isFinite(feePercent)
      && marginPercent + feePercent >= 100) {
    issues.feePercent = 'Tổng tỉ lệ lãi mục tiêu và phí bán hàng phải nhỏ hơn 100%.';
  }
  return issues;
}

export function calculateFoamPrice(values, isShopee = false) {
  const { feePercent, ...requiredInputs } = values;
  const {
    toolMinutes, toolHourly, fineLength, finePerMetre, fineComplexity, fineMaterial,
    bladeLength, bladePerMetre, bladeComplexity, bladeMaterial,
    laserMinutes, laserReplacement, laserRecoveryHours, foilMinutes, foilHourly,
    laminatorMinutes, laminatorHourly, foamSheets, foamPerSheet, foamWaste,
    paperSheets, paperPerSheet, paperWaste, matteLength, mattePerMetre, matteWaste,
    glueLength, glueWidth, glueFaces, glueGramsPerSquareMetre, gluePerGram,
    toolWatts, laminatorWatts, electricityPerKwh, labourMinutes, labourHourly,
    packaging, foilSupplies, extraCosts, overhead, marginPercent,
  } = requiredInputs;

  if (!Object.values(requiredInputs).every(Number.isFinite) || (!isShopee && !Number.isFinite(feePercent))
      || Object.keys(foamInputIssues(values, isShopee)).length > 0) return null;

  const toolHours = toolMinutes / 60;
  const laminatorHours = laminatorMinutes / 60;
  const laserHourly = laserRecoveryHours > 0 ? laserReplacement / laserRecoveryHours : null;
  const glueArea = glueLength * glueWidth * glueFaces / 10000;
  const costs = {
    machine: [
      toolHours * toolHourly,
      fineLength * finePerMetre * fineComplexity * fineMaterial,
      bladeLength * bladePerMetre * bladeComplexity * bladeMaterial,
      laserMinutes / 60 * (laserHourly ?? 0),
      foilMinutes / 60 * foilHourly,
      laminatorHours * laminatorHourly,
    ],
    material: [
      foamSheets * foamPerSheet * (1 + foamWaste / 100),
      paperSheets * paperPerSheet * (1 + paperWaste / 100),
    ],
    matte: [matteLength * mattePerMetre * (1 + matteWaste / 100)],
    glue: [glueArea * glueGramsPerSquareMetre * gluePerGram],
    electricity: [
      toolHours * (toolWatts / 1000) * electricityPerKwh,
      laminatorHours * (laminatorWatts / 1000) * electricityPerKwh,
    ],
    labour: [labourMinutes / 60 * labourHourly],
    other: [packaging, foilSupplies, extraCosts, overhead],
  };
  const totalCost = Object.values(costs).flat().reduce((total, amount) => total + amount, 0);
  const ratePercent = isShopee ? shopeeRate * 100 : feePercent;
  const fixedFee = isShopee ? shopeeFixed : 0;
  const salePrice = (totalCost + fixedFee) / ((100 - marginPercent - ratePercent) / 100);
  if (!Number.isFinite(salePrice) || salePrice > Number.MAX_SAFE_INTEGER) return null;

  const fees = isShopee ? calculateShopeeFees(salePrice) : [];
  const salesFee = isShopee ? fees.reduce((total, fee) => total + fee, 0) : salePrice * (feePercent / 100);
  const profit = salePrice - totalCost - salesFee;
  const actualMargin = salePrice > 0 ? (profit / salePrice) * 100 : null;
  return { costs, laserHourly, totalCost, salePrice, fees, salesFee, profit, actualMargin };
}
