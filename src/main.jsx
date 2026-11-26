import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  calculatePrice, exceedsShopeeMultiplierLimit, parseAmount, parsePercentage, parseWholeNumber, shopeeFees,
} from './pricing.js';
import brandLogo from '../Images/game-piece-labs-logo-horizontal.webp';
import './styles.css';

const fields = [
  { key: 'grams', label: 'Khối lượng sản phẩm', unit: 'g' },
  { key: 'filamentPrice', label: 'Giá nhựa', unit: 'đ/kg', parse: parseWholeNumber },
  { key: 'hours', label: 'Thời gian in', unit: 'giờ' },
  { key: 'powerWatts', label: 'Công suất máy', unit: 'W' },
  { key: 'electricityPerKwh', label: 'Giá điện', unit: 'đ/kWh', parse: parseWholeNumber },
  { key: 'printerPrice', label: 'Giá máy in', unit: 'đ', parse: parseWholeNumber },
  { key: 'printerLifetimeHours', label: 'Tuổi thọ máy', unit: 'giờ', parse: parseWholeNumber, positive: true },
  { key: 'wastePercent', label: 'Tỉ lệ in hỏng', unit: '%', parse: parsePercentage },
  { key: 'packaging', label: 'Bao bì, đóng gói', unit: 'đ', parse: parseWholeNumber },
  { key: 'saleMultiplier', label: 'Hệ số nhân giá bán', unit: 'lần', positive: true },
];
const numberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const format = (amount) => numberFormat.format(amount);
const money = (amount) => amount == null ? '—' : `${format(amount)} ₫`;

function formatWholeNumberInput(event, previous) {
  const input = event.target;
  const raw = input.value;
  const { inputType, data } = event.nativeEvent;
  const editsDigits = inputType?.startsWith('delete') || (inputType === 'insertText' && /^\d+$/.test(data ?? ''));
  // A keystroke can temporarily leave the separators from the previous value in place.
  const candidate = editsDigits && parseWholeNumber(previous) !== null && /^[\d.]+$/.test(raw)
    ? raw.replaceAll('.', '') : raw;
  const number = parseWholeNumber(candidate);
  if (number === null) return raw;

  const formatted = format(number);
  if (formatted !== raw) {
    const digitsAfterCaret = raw.slice(input.selectionStart).replace(/\D/g, '').length;
    let caret = formatted.length;
    let remaining = digitsAfterCaret;
    while (caret > 0 && remaining > 0) {
      caret -= 1;
      if (/\d/.test(formatted[caret])) remaining -= 1;
    }
    requestAnimationFrame(() => {
      if (input.value === formatted && document.activeElement === input) input.setSelectionRange(caret, caret);
    });
  }
  return formatted;
}

function CostGroup({ id, title, rows, subtotal }) {
  return (
    <section className="cost-group" aria-labelledby={id}>
      <div className="cost-heading">
        <h3 id={id}>{title}</h3>
        <strong>{money(subtotal)}</strong>
      </div>
      <table aria-labelledby={id}>
        <tbody>
          {rows.map(([label, amount, explanation]) => (
            <tr key={label}>
              <th scope="row">{label}{explanation && <small>{explanation}</small>}</th>
              <td>{money(amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function App() {
  const [inputs, setInputs] = useState({});
  const [isShopee, setIsShopee] = useState(false);
  const values = Object.fromEntries(fields.map(({ key, parse = parseAmount, positive }) => {
    const value = parse(inputs[key] ?? '');
    return [key, positive && value === 0 ? null : value];
  }));
  const valid = Object.values(values).every((value) => value !== null);
  const multiplierTooHigh = isShopee && values.saleMultiplier !== null
    && exceedsShopeeMultiplierLimit(values.saleMultiplier);
  const multiplierError = 'Hệ số quá cao để tính giá Shopee. Hãy giảm hệ số (ví dụ 4,25 trở xuống).';
  const result = valid && !multiplierTooHigh ? calculatePrice({ ...values, isShopee }) : null;

  const printCosts = [
    ['Tiền nhựa', result?.filament, 'Khối lượng × giá nhựa ÷ 1.000'],
    ['Tiền điện', result?.electricity, 'Công suất ÷ 1.000 × giờ in × giá điện'],
    ['Hao mòn máy', result?.machine, 'Giá máy ÷ tuổi thọ × giờ in'],
    ['In hỏng', result?.waste, 'Tỉ lệ in hỏng × tổng tiền nhựa, điện và máy'],
  ];
  const marketplaceCosts = shopeeFees.map(({ label, basisPoints, fixed }, index) => [
    label, result?.fees[index], fixed ? `${money(fixed)}/đơn` : `${format(basisPoints / 100)}% giá bán`,
  ]);
  const printSubtotal = result ? printCosts.reduce((total, [, amount]) => total + amount, 0) : null;
  const marketplaceSubtotal = result?.fees.reduce((total, amount) => total + amount, 0);

  return (
    <main className="shell">
      <header className="intro">
        <img className="brand-logo" src={brandLogo} alt="Game Piece Labs" width="256" height="98" />
        <h1>Bảng tính giá bán đồ in 3D</h1>
        <p>Điền các ô màu vàng để tự động tính chi phí và giá bán cho một sản phẩm.</p>
      </header>

      <div className="workspace">
        <section className="card inputs" aria-labelledby="inputs-title">
          <h2 id="inputs-title">Thông số nhập</h2>
          <div className="field-list">
            {fields.map(({ key, label, unit, parse, positive }) => {
              const input = inputs[key] ?? '';
              const invalidMultiplier = key === 'saleMultiplier' && multiplierTooHigh;
              const invalid = invalidMultiplier || (input.trim() !== '' && values[key] === null);
              const messages = {
                whole: 'Nhập số nguyên từ 0 trở lên.',
                wholePositive: 'Nhập số nguyên lớn hơn 0.',
                percent: 'Nhập tỉ lệ từ 0 đến 100%.',
                positive: 'Nhập số lớn hơn 0.',
                amount: 'Nhập số từ 0 trở lên.',
              };
              const message = invalidMultiplier ? multiplierError : messages[parse === parseWholeNumber ? (positive ? 'wholePositive' : 'whole')
                : parse === parsePercentage ? 'percent' : positive ? 'positive' : 'amount'];
              return (
                <div className="field" key={key}>
                  <label htmlFor={key}>{label}</label>
                  <div className="input-box">
                    <input
                      id={key}
                      inputMode={parse === parseWholeNumber ? 'numeric' : 'decimal'}
                      value={input}
                      onChange={(event) => {
                        const value = parse === parseWholeNumber
                          ? formatWholeNumberInput(event, input) : event.target.value;
                        setInputs((current) => ({ ...current, [key]: value }));
                      }}
                      aria-invalid={invalid}
                      aria-describedby={invalid ? `${key}-error` : undefined}
                      autoComplete="off"
                      required
                    />
                    <span className="unit">{unit}</span>
                  </div>
                  {invalid && <p id={`${key}-error`} className="error">{message}</p>}
                </div>
              );
            })}
          </div>
          <div className="marketplace">
            <label className="marketplace-toggle">
              <input type="checkbox" checked={isShopee} onChange={(event) => setIsShopee(event.target.checked)} />
              Bán qua Shopee
            </label>
            {isShopee && <p>Phí theo phần trăm tính trên giá bán đã làm tròn. Phí hạ tầng tính cho một đơn có một sản phẩm.</p>}
          </div>
        </section>

        <section className="card breakdown" aria-labelledby="breakdown-title">
          <h2 id="breakdown-title">Chi tiết chi phí</h2>
          <CostGroup id="print-costs" title="Chi phí in" rows={printCosts} subtotal={printSubtotal} />
          <div className="cost-heading packaging-cost">
            <h3>Bao bì, đóng gói</h3>
            <strong>{money(result?.packaging)}</strong>
          </div>
          {isShopee && <CostGroup id="marketplace-costs" title="Phí Shopee" rows={marketplaceCosts} subtotal={marketplaceSubtotal} />}
          <div className="cost-heading cost-total">
            <h3>Tổng chi phí</h3>
            <strong>{money(result?.totalCost)}</strong>
          </div>
        </section>

        <section className="sale" aria-labelledby="sale-title">
          <div>
            <h2 id="sale-title">Giá bán gợi ý</h2>
            <p className="sale-amount" aria-live="polite">{money(result?.salePrice)}</p>
          </div>
          <div className="sale-details">
            {result ? (
              <>
                <p>Trước làm tròn <strong>{money(result.unroundedSalePrice)}</strong></p>
                <p>{isShopee
                  ? `Giữ hệ số × ${format(values.saleMultiplier)} trên tổng chi phí đã gồm phí Shopee.`
                  : `Tổng chi phí × ${format(values.saleMultiplier)}, làm tròn lên bội số 1.000 ₫.`}</p>
                <p>Lãi mỗi sản phẩm <strong>{money(result.profit)}</strong></p>
              </>
            ) : <>
              <p>{multiplierTooHigh ? 'Giảm hệ số nhân để tính được giá Shopee.'
                : valid ? 'Số tiền vượt giới hạn tính toán.' : 'Điền đủ 10 ô để tính giá bán.'}</p>
              <p>Lãi mỗi sản phẩm <strong>—</strong></p>
            </>}
          </div>
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
