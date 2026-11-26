import React, { useRef, useState } from 'react';
import { CostGroup, NumberField, ShopeeCostGroup, format, money } from './calculator-ui.jsx';
import { calculateFoamPrice, foamInputIssues } from './foam-pricing.js';
import { parseAmount, parsePercentage, parseWholeNumber } from './pricing.js';

const number = (key, label, unit) => ({ key, label, unit });
const whole = (key, label, unit) => ({ key, label, unit, parse: parseWholeNumber });
const percent = (key, label) => ({ key, label, unit: '%', parse: parsePercentage });

const defaultInputs = {
  toolHourly: '20.000',
  finePerMetre: '500',
  bladePerMetre: '1.000',
  laserReplacement: '14.000.000',
  laserRecoveryHours: '400',
  laminatorHourly: '5.000',
  foamPerSheet: '55.000',
  paperPerSheet: '11.200',
  mattePerMetre: '1.100',
  glueGramsPerSquareMetre: '100',
  gluePerGram: '60',
  toolWatts: '200',
  laminatorWatts: '500',
  electricityPerKwh: '5.000',
  labourHourly: '20.000',
};

const inputGroups = [
  ['Máy và dụng cụ', [
    ['Máy xTool', [
      number('toolMinutes', 'Tổng thời gian chạy xTool', 'phút'),
      whole('toolHourly', 'Khấu hao xTool', 'đ/giờ'),
    ]],
    ['Dao Fine-Point Blade', [
      number('fineLength', 'Chiều dài cắt', 'm'),
      whole('finePerMetre', 'Hao mòn dao', 'đ/m'),
      number('fineComplexity', 'Hệ số đường cắt', 'lần'),
      number('fineMaterial', 'Hệ số vật liệu', 'lần'),
    ]],
    ['Dao Cutting Blade', [
      number('bladeLength', 'Chiều dài cắt', 'm'),
      whole('bladePerMetre', 'Hao mòn dao', 'đ/m'),
      number('bladeComplexity', 'Hệ số đường cắt', 'lần'),
      number('bladeMaterial', 'Hệ số vật liệu', 'lần'),
    ]],
    ['Laser 20W', [
      number('laserMinutes', 'Thời gian chạy laser', 'phút'),
      whole('laserReplacement', 'Giá thay module laser', 'đ'),
      number('laserRecoveryHours', 'Số giờ thu hồi chi phí module', 'giờ'),
    ]],
    ['Hot Foil Pen', [
      number('foilMinutes', 'Thời gian sử dụng', 'phút'),
      whole('foilHourly', 'Hao mòn bút', 'đ/giờ'),
    ]],
    ['Máy cán', [
      number('laminatorMinutes', 'Thời gian chạy máy cán', 'phút'),
      whole('laminatorHourly', 'Khấu hao máy cán', 'đ/giờ'),
    ]],
  ]],
  ['EVA Foam và giấy', [
    ['EVA Foam', [
      number('foamSheets', 'Số tấm foam', 'tấm'),
      whole('foamPerSheet', 'Giá foam', 'đ/tấm'),
      percent('foamWaste', 'Hao hụt foam'),
    ]],
    ['Giấy', [
      number('paperSheets', 'Số tờ giấy', 'tờ'),
      whole('paperPerSheet', 'Giá giấy', 'đ/tờ'),
      percent('paperWaste', 'Hao hụt giấy'),
    ]],
  ]],
  ['Màng cán Matte', [[null, [
    number('matteLength', 'Chiều dài màng sử dụng', 'm'),
    whole('mattePerMetre', 'Giá màng', 'đ/m'),
    percent('matteWaste', 'Hao hụt màng'),
  ]]]],
  ['Keo dán', [[null, [
    number('glueLength', 'Tổng chiều dài vùng dán', 'cm'),
    number('glueWidth', 'Chiều rộng vùng dán', 'cm'),
    whole('glueFaces', 'Số mặt cần dán', 'mặt'),
    number('glueGramsPerSquareMetre', 'Định mức keo', 'g/m²'),
    whole('gluePerGram', 'Giá keo', 'đ/g'),
  ]]]],
  ['Điện', [[null, [
    number('toolWatts', 'Công suất trung bình xTool', 'W'),
    number('laminatorWatts', 'Công suất máy cán', 'W'),
    whole('electricityPerKwh', 'Giá điện', 'đ/kWh'),
  ]]]],
  ['Nhân công', [[null, [
    number('labourMinutes', 'Thời gian làm thủ công', 'phút'),
    whole('labourHourly', 'Đơn giá nhân công', 'đ/giờ'),
  ]]]],
  ['Chi phí phụ', [[null, [
    whole('packaging', 'Chi phí đóng gói', 'đ'),
    whole('foilSupplies', 'Chi phí vật tư foil', 'đ'),
    whole('extraCosts', 'Chi phí phát sinh', 'đ'),
    whole('overhead', 'Chi phí chung phân bổ', 'đ'),
  ]]]],
  ['Định giá bán', [[null, [
    percent('marginPercent', 'Tỉ lệ lãi mục tiêu'),
    percent('feePercent', 'Tỉ lệ phí bán hàng'),
  ]]]],
];

const fields = inputGroups.flatMap(([, sections]) => sections.flatMap(([, sectionFields]) => sectionFields));
const boxFields = [
  number('foamLength', 'Chiều dài foam', 'cm'),
  number('foamWidth', 'Chiều rộng foam', 'cm'),
  number('paperLength', 'Chiều dài giấy', 'cm'),
  number('paperWidth', 'Chiều rộng giấy', 'cm'),
  { ...whole('quantity', 'Số Box giống nhau', 'Box'), positive: true },
  whole('parts', 'Số chi tiết mỗi Box', 'chi tiết'),
];
const costGroups = [
  ['machine', 'Máy và dụng cụ', ['Khấu hao xTool', 'Fine-Point Blade', 'Cutting Blade', 'Dự phòng module Laser 20W', 'Hot Foil Pen', 'Khấu hao máy cán']],
  ['material', 'EVA Foam và giấy', ['EVA Foam', 'Giấy']],
  ['matte', 'Màng cán Matte', ['Chi phí màng cán']],
  ['glue', 'Keo dán', ['Chi phí keo']],
  ['electricity', 'Điện', ['Điện xTool', 'Điện máy cán']],
  ['labour', 'Nhân công', ['Chi phí làm thủ công']],
  ['other', 'Chi phí phụ', ['Đóng gói', 'Vật tư foil', 'Phát sinh', 'Chi phí chung']],
];

function BoxList() {
  const [boxes, setBoxes] = useState([]);
  const nextId = useRef(1);
  const updateBox = (id, key, value) => {
    setBoxes((current) => current.map((box) => box.id === id ? { ...box, [key]: value } : box));
  };
  const addBox = () => {
    const id = nextId.current++;
    setBoxes((current) => [...current, { id }]);
  };

  return (
    <section className="card foam-boxes" aria-labelledby="box-title">
      <div className="foam-box-heading">
        <h2 id="box-title">Danh sách Box</h2>
        <button type="button" className="foam-button" onClick={addBox}>Thêm Box</button>
      </div>
      <p className="foam-note">Nhập số tấm foam và số tờ giấy dùng cho cả bộ trong nhóm EVA Foam và giấy.</p>
      <div className="foam-box-list">
        {boxes.map((box) => (
          <section key={box.id} className="foam-box" aria-labelledby={`box-title-${box.id}`}>
            <div className="foam-box-heading">
              <h3 id={`box-title-${box.id}`}>Box {box.id}</h3>
              <button type="button" className="foam-remove" aria-label={`Xóa Box ${box.id}`}
                onClick={() => setBoxes((current) => current.filter((item) => item.id !== box.id))}>Xóa</button>
            </div>
            <div className="foam-fields">
              <div className="field">
                <label htmlFor={`box-name-${box.id}`}>Tên Box</label>
                <div className="input-box">
                  <input id={`box-name-${box.id}`} value={box.name ?? ''}
                    onChange={(event) => updateBox(box.id, 'name', event.target.value)} />
                </div>
              </div>
              {boxFields.map((field) => {
                const input = box[field.key] ?? '';
                const value = (field.parse ?? parseAmount)(input);
                return <NumberField key={field.key} id={`box-${box.id}-${field.key}`} field={field}
                  input={input} value={field.positive && value === 0 ? null : value} required={false}
                  onChange={(amount) => updateBox(box.id, field.key, amount)} />;
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export default function FoamCalculator() {
  const [inputs, setInputs] = useState(defaultInputs);
  const [isShopee, setIsShopee] = useState(false);
  const values = Object.fromEntries(fields.map(({ key, parse = parseAmount }) => [key, parse(inputs[key] ?? '')]));
  const issues = foamInputIssues(values, isShopee);
  const isActiveField = ({ key }) => key !== 'feePercent' || !isShopee;
  const invalidGroup = inputGroups.find(([, sections]) => sections.some(([, groupFields]) =>
    groupFields.some((field) => isActiveField(field) && (values[field.key] === null || issues[field.key]))));
  const result = invalidGroup ? null : calculateFoamPrice(values, isShopee);
  const laserHourly = values.laserReplacement !== null && values.laserRecoveryHours > 0
    ? values.laserReplacement / values.laserRecoveryHours : null;

  return (
    <div className="workspace foam-workspace">
      <BoxList />

      <section className="card inputs" aria-labelledby="foam-inputs-title">
        <h2 id="foam-inputs-title">Thông số nhập</h2>
        <p className="foam-note">Bạn có thể sửa các mức điền sẵn. Nhập 0 cho các khoản không sử dụng.</p>
        <div className="marketplace">
          <label className="marketplace-toggle">
            <input type="checkbox" checked={isShopee} onChange={(event) => setIsShopee(event.target.checked)} />
            Bán qua Shopee
          </label>
          {isShopee && <p>Phí theo phần trăm tính trên giá bán. Phí hạ tầng tính cho một đơn có một bộ sản phẩm.</p>}
        </div>
        <div className="foam-input-groups">
          {inputGroups.map(([title, sections]) => (
            <details key={title} open={title === 'Máy và dụng cụ'}>
              <summary>{title}</summary>
              {sections.map(([subtitle, groupFields]) => (
                <div className="foam-fields" key={subtitle ?? title}>
                  {subtitle && <h3>{subtitle}</h3>}
                  {subtitle === 'Máy xTool' && <p className="foam-note">Tổng phút xTool bao gồm thời gian chạy laser và foil.</p>}
                  {groupFields.filter(isActiveField).map((field) => (
                    <NumberField key={field.key} id={`foam-${field.key}`} field={field}
                      input={inputs[field.key] ?? ''} value={values[field.key]} error={issues[field.key]}
                      onChange={(value) => setInputs((current) => ({ ...current, [field.key]: value }))} />
                  ))}
                  {subtitle === 'Laser 20W' && <p className="foam-note">Dự phòng thay module mỗi giờ <strong>{money(laserHourly)}</strong></p>}
                </div>
              ))}
            </details>
          ))}
        </div>
      </section>

      <section className="card breakdown" aria-labelledby="foam-breakdown-title">
        <h2 id="foam-breakdown-title">Chi tiết chi phí</h2>
        {costGroups.map(([key, title, labels]) => {
          const amounts = result?.costs[key];
          return <CostGroup key={key} id={`foam-cost-${key}`} title={title}
            rows={labels.map((label, index) => [label, amounts?.[index]])}
            subtotal={amounts?.reduce((total, amount) => total + amount, 0)} />;
        })}
        <div className="cost-heading cost-total">
          <h3>Tổng giá vốn</h3>
          <strong>{money(result?.totalCost)}</strong>
        </div>
        {isShopee && <>
          <ShopeeCostGroup id="foam-marketplace-costs" fees={result?.fees} />
          <div className="cost-heading cost-total">
            <h3>Tổng chi phí gồm phí Shopee</h3>
            <strong>{money(result ? result.totalCost + result.salesFee : null)}</strong>
          </div>
        </>}
      </section>

      <section className="sale" aria-labelledby="foam-sale-title">
        <div>
          <h2 id="foam-sale-title">Giá bán cho một bộ</h2>
          <p className="sale-amount" aria-live="polite">{money(result?.salePrice)}</p>
        </div>
        <div className="sale-details">
          {result ? <>
            <p>{isShopee ? 'Phí Shopee' : 'Phí bán hàng'} <strong>{money(result.salesFee)}</strong></p>
            <p>Lãi sau phí <strong>{money(result.profit)}</strong></p>
            <p>Tỉ lệ lãi thực tế <strong>{result.actualMargin === null ? '—' : `${format(result.actualMargin)}%`}</strong></p>
          </> : <p>{invalidGroup ? `Kiểm tra các ô trong nhóm ${invalidGroup[0]}.` : 'Số tiền vượt giới hạn tính toán.'}</p>}
        </div>
      </section>

    </div>
  );
}
