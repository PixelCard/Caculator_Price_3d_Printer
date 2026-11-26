import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  calculatePrice, exceedsShopeeMultiplierLimit, parseAmount, parsePercentage, parseWholeNumber, shopeeFees,
} from './pricing.js';
import brandLogo from '../Images/game-piece-labs-logo-horizontal.webp';
import { CostGroup, NumberField, format, money } from './calculator-ui.jsx';
import FoamCalculator from './FoamCalculator.jsx';
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
function PrintCalculator() {
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
      <div className="workspace">
        <section className="card inputs" aria-labelledby="inputs-title">
          <h2 id="inputs-title">Thông số nhập</h2>
          <div className="field-list">
            {fields.map((field) => (
              <NumberField
                key={field.key}
                id={field.key}
                field={field}
                input={inputs[field.key] ?? ''}
                value={values[field.key]}
                error={field.key === 'saleMultiplier' && multiplierTooHigh ? multiplierError : undefined}
                onChange={(value) => setInputs((current) => ({ ...current, [field.key]: value }))}
              />
            ))}
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
  );
}

const pages = {
  '#in-3d': { label: 'Tính giá in 3D', title: 'Bảng tính giá bán đồ in 3D', unit: 'một sản phẩm' },
  '#foam-giay': { label: 'Tính giá Foam & Giấy', title: 'Bảng tính giá bán Foam & Giấy', unit: 'một bộ sản phẩm' },
};
const currentPage = () => window.location.hash === '#foam-giay' ? '#foam-giay' : '#in-3d';

function App() {
  const [page, setPage] = useState(currentPage);
  useEffect(() => {
    const updatePage = () => setPage(currentPage());
    window.addEventListener('hashchange', updatePage);
    return () => window.removeEventListener('hashchange', updatePage);
  }, []);
  const { title, unit } = pages[page];
  useEffect(() => {
    document.title = `${title} – Game Piece Labs`;
  }, [title]);

  return (
    <main className="shell">
      <header className="intro">
        <div className="brand-bar">
          <img className="brand-logo" src={brandLogo} alt="Game Piece Labs" width="256" height="98" />
          <nav className="calculator-nav" aria-label="Chọn bảng tính">
            {Object.entries(pages).map(([route, { label }]) => (
              <a key={route} href={route} aria-current={route === page ? 'page' : undefined}>{label}</a>
            ))}
          </nav>
        </div>
        <h1>{title}</h1>
        <p>Điền các ô màu vàng để tự động tính chi phí và giá bán cho {unit}.</p>
      </header>
      <div hidden={page !== '#in-3d'}><PrintCalculator /></div>
      <div hidden={page !== '#foam-giay'}><FoamCalculator /></div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
