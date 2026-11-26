import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { assumptions, calculatePrice, parseAmount, parseFilamentPrice } from './pricing.js';
import './styles.css';

const fields = [
  { key: 'grams', label: 'Lượng nhựa tiêu hao', unit: 'g' },
  { key: 'filamentPrice', label: 'Giá nhựa', unit: 'đ/kg', hint: 'Ví dụ 150.000 đ/kg', parse: parseFilamentPrice },
  { key: 'hours', label: 'Thời gian in', unit: 'giờ', hint: '30 phút = 0,5 giờ' },
];
const example = { grams: '8', filamentPrice: '150.000', hours: '1' };
const numberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const format = (amount) => numberFormat.format(amount);
const money = (amount) => amount == null ? '—' : `${format(amount)} ₫`;

function App() {
  const [inputs, setInputs] = useState(example);
  const grams = parseAmount(inputs.grams);
  const filamentPrice = parseFilamentPrice(inputs.filamentPrice);
  const hours = parseAmount(inputs.hours);
  const valid = grams != null && filamentPrice != null && hours != null;
  const result = valid ? calculatePrice(grams, filamentPrice, hours) : null;

  const details = [
    ['Tiền nhựa', result?.filament, valid ? `${format(grams)} g × ${format(filamentPrice / 1000)} đ/g` : 'Lượng nhựa × đơn giá theo gram'],
    ['Tiền điện', result?.electricity, '300 đ/giờ × thời gian in'],
    ['Tiền máy', result?.machine, '2.000 đ/giờ × thời gian in'],
    ['Chi phí một lượt in', result?.subtotal],
    ['Dự phòng in hỏng', result?.waste, '10% chi phí một lượt in'],
    ['Tổng chi phí in ước tính', result?.printingCost],
  ];

  return (
    <main className="shell">
      <header className="intro">
        <div className="title-line">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Tính giá in 3D</span>
        </div>
        <h1>Chi phí in và giá bán</h1>
        <p>Nhập ba thông số để xem từng khoản chi phí và giá bán gợi ý cho một sản phẩm.</p>
      </header>

      <div className="workspace">
        <section className="card inputs" aria-labelledby="inputs-title">
          <div className="section-heading">
            <h2 id="inputs-title">Thông số in</h2>
            <button type="button" className="example" onClick={() => setInputs(example)}>Điền ví dụ</button>
          </div>
          <div className="field-list">
            {fields.map(({ key, label, unit, hint, parse = parseAmount }) => {
              const invalid = inputs[key].trim() !== '' && parse(inputs[key]) === null;
              const invalidMessage = key === 'filamentPrice'
                ? 'Nhập số nguyên từ 0 trở lên, ví dụ 150.000.'
                : 'Nhập số từ 0 trở lên, ví dụ 0,5.';
              const message = invalid ? invalidMessage : hint;
              return (
                <div className="field" key={key}>
                  <label htmlFor={key}>{label}</label>
                  <div className="input-box">
                    <input
                      id={key}
                      inputMode="decimal"
                      value={inputs[key]}
                      onChange={(event) => setInputs({ ...inputs, [key]: event.target.value })}
                      aria-invalid={invalid}
                      aria-describedby={message ? `${key}-hint` : undefined}
                      autoComplete="off"
                    />
                    <span className="unit">{unit}</span>
                  </div>
                  {message && <p id={`${key}-hint`} className={invalid ? 'error' : 'hint'}>{message}</p>}
                </div>
              );
            })}
          </div>
          <details className="assumptions">
            <summary>Thông số mặc định</summary>
            <dl>
              <div><dt>Điện · 100 W × 3.000 đ/kWh</dt><dd>300 đ/giờ</dd></div>
              <div><dt>Máy · 10 triệu ÷ 5.000 giờ</dt><dd>2.000 đ/giờ</dd></div>
              <div><dt>Dự phòng in hỏng</dt><dd>10%</dd></div>
              <div><dt>Hệ số giá bán</dt><dd>× {assumptions.saleMultiplier}</dd></div>
            </dl>
            <p className="hint">Hệ số 3 lấy từ công thức giá bán trong bài mẫu.</p>
          </details>
        </section>

        <section className="card breakdown" aria-labelledby="breakdown-title">
          <h2 id="breakdown-title">Chi tiết chi phí</h2>
          <table>
            <thead><tr><th scope="col">Khoản chi</th><th scope="col">Số tiền</th></tr></thead>
            <tbody>
              {details.map(([label, amount, explanation], index) => (
                <tr key={label} className={index === 3 ? 'subtotal' : index === 5 ? 'total' : undefined}>
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
                <p>Chi phí in × 3, làm tròn lên bội số 1.000 ₫.</p>
              </>
            ) : <p>{valid ? 'Số tiền vượt giới hạn tính toán.' : 'Điền đủ ba ô bằng số hợp lệ để tính giá.'}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
