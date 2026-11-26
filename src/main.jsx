import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { calculatePrice, parseAmount, parsePercentage, parseWholeNumber } from './pricing.js';
import './styles.css';

const fields = [
  { key: 'grams', label: 'Khối lượng sản phẩm', unit: 'g', example: '8' },
  { key: 'filamentPrice', label: 'Giá nhựa', unit: 'đ/kg', example: '150.000', parse: parseWholeNumber },
  { key: 'hours', label: 'Thời gian in', unit: 'giờ', example: '1' },
  { key: 'powerWatts', label: 'Công suất máy', unit: 'W', example: '100' },
  { key: 'electricityPerKwh', label: 'Giá điện', unit: 'đ/kWh', example: '3.000', parse: parseWholeNumber },
  { key: 'printerPrice', label: 'Giá máy in', unit: 'đ', example: '10.000.000', parse: parseWholeNumber },
  { key: 'printerLifetimeHours', label: 'Tuổi thọ máy', unit: 'giờ', example: '5.000', parse: parseWholeNumber, positive: true },
  { key: 'wastePercent', label: 'Tỉ lệ in hỏng', unit: '%', example: '10', parse: parsePercentage },
  { key: 'packaging', label: 'Bao bì, đóng gói', unit: 'đ', example: '0', parse: parseWholeNumber },
  { key: 'saleMultiplier', label: 'Hệ số nhân giá bán', unit: 'lần', example: '3', positive: true },
];
const example = Object.fromEntries(fields.map((field) => [field.key, field.example]));
const numberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const format = (amount) => numberFormat.format(amount);
const money = (amount) => amount == null ? '—' : `${format(amount)} ₫`;

function App() {
  const [inputs, setInputs] = useState({});
  const values = Object.fromEntries(fields.map(({ key, parse = parseAmount, positive }) => {
    const value = parse(inputs[key] ?? '');
    return [key, positive && value === 0 ? null : value];
  }));
  const valid = Object.values(values).every((value) => value !== null);
  const result = valid ? calculatePrice(values) : null;

  const details = [
    ['Tiền nhựa', result?.filament, 'Khối lượng × giá nhựa ÷ 1.000'],
    ['Tiền điện', result?.electricity, 'Công suất ÷ 1.000 × giờ in × giá điện'],
    ['Hao mòn máy', result?.machine, 'Giá máy ÷ tuổi thọ × giờ in'],
    ['In hỏng', result?.waste, 'Tỉ lệ in hỏng × tổng tiền nhựa, điện và máy'],
    ['Bao bì', result?.packaging],
    ['Tổng chi phí', result?.totalCost],
  ];

  return (
    <main className="shell">
      <header className="intro">
        <div className="title-line">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>BrosFil</span>
        </div>
        <h1>Bảng tính giá bán đồ in 3D</h1>
        <p>Điền các ô màu vàng để tự động tính chi phí và giá bán cho một sản phẩm.</p>
      </header>

      <div className="workspace">
        <section className="card inputs" aria-labelledby="inputs-title">
          <div className="section-heading">
            <h2 id="inputs-title">Thông số nhập</h2>
            <button type="button" className="example" onClick={() => setInputs(example)}>Điền mẫu Excel</button>
          </div>
          <div className="field-list">
            {fields.map(({ key, label, unit, parse, positive }) => {
              const input = inputs[key] ?? '';
              const invalid = input.trim() !== '' && values[key] === null;
              const messages = {
                whole: 'Nhập số nguyên từ 0 trở lên.',
                wholePositive: 'Nhập số nguyên lớn hơn 0.',
                percent: 'Nhập tỉ lệ từ 0 đến 100%.',
                positive: 'Nhập số lớn hơn 0.',
                amount: 'Nhập số từ 0 trở lên.',
              };
              const message = messages[parse === parseWholeNumber ? (positive ? 'wholePositive' : 'whole')
                : parse === parsePercentage ? 'percent' : positive ? 'positive' : 'amount'];
              return (
                <div className="field" key={key}>
                  <label htmlFor={key}>{label}</label>
                  <div className="input-box">
                    <input
                      id={key}
                      inputMode={parse === parseWholeNumber ? 'numeric' : 'decimal'}
                      value={input}
                      onChange={(event) => setInputs({ ...inputs, [key]: event.target.value })}
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
        </section>

        <section className="card breakdown" aria-labelledby="breakdown-title">
          <h2 id="breakdown-title">Chi tiết chi phí</h2>
          <table>
            <thead><tr><th scope="col">Khoản chi</th><th scope="col">Số tiền</th></tr></thead>
            <tbody>
              {details.map(([label, amount, explanation], index) => (
                <tr key={label} className={index === details.length - 1 ? 'total' : undefined}>
                  <th scope="row">{label}{explanation && <small>{explanation}</small>}</th>
                  <td>{money(amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <p>Tổng chi phí × {format(values.saleMultiplier)}, làm tròn lên bội số 1.000 ₫.</p>
                <p>Lãi mỗi sản phẩm <strong>{money(result.profit)}</strong></p>
              </>
            ) : <>
              <p>{valid ? 'Số tiền vượt giới hạn tính toán.' : 'Điền đủ 10 ô để tính giá bán.'}</p>
              <p>Lãi mỗi sản phẩm <strong>—</strong></p>
            </>}
          </div>
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
