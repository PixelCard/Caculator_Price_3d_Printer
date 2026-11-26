import React from 'react';
import { parsePercentage, parseWholeNumber, shopeeFees } from './pricing.js';

const numberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
export const format = (amount) => numberFormat.format(amount);
export const money = (amount) => amount == null ? '—' : `${format(Math.trunc(amount) || 0)} ₫`;

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
    let digitsAfterCaret = raw.slice(input.selectionStart).replace(/\D/g, '').length;
    let caret = formatted.length;
    while (caret > 0 && digitsAfterCaret > 0) {
      caret -= 1;
      if (/\d/.test(formatted[caret])) digitsAfterCaret -= 1;
    }
    requestAnimationFrame(() => {
      if (input.value === formatted && document.activeElement === input) input.setSelectionRange(caret, caret);
    });
  }
  return formatted;
}

export function NumberField({ id, field, input, value, onChange, error, required = true }) {
  const { label, unit, parse, positive } = field;
  const isWhole = parse === parseWholeNumber;
  const invalid = Boolean(error) || (input.trim() !== '' && value === null);
  const message = error ?? (parse === parsePercentage
    ? 'Nhập tỉ lệ từ 0 đến 100%.'
    : `Nhập số${isWhole ? ' nguyên' : ''} ${positive ? 'lớn hơn 0' : 'từ 0 trở lên'}.`);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-box">
        <input
          id={id}
          inputMode={isWhole ? 'numeric' : 'decimal'}
          value={input}
          onChange={(event) => onChange(isWhole ? formatWholeNumberInput(event, input) : event.target.value)}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          autoComplete="off"
          required={required}
        />
        <span className="unit">{unit}</span>
      </div>
      {invalid && <p id={`${id}-error`} className="error">{message}</p>}
    </div>
  );
}

export function CostGroup({ id, title, rows, subtotal, collapsible = false, initiallyOpen = false }) {
  const Group = collapsible ? 'details' : 'section';
  const Heading = collapsible ? 'summary' : 'div';
  return (
    <Group className="cost-group" aria-labelledby={id} open={collapsible ? initiallyOpen : undefined}>
      <Heading className="cost-heading">
        <h3 id={id}>{title}</h3>
        <strong>{money(subtotal)}</strong>
      </Heading>
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
    </Group>
  );
}

export function ShopeeCostGroup({ id, fees }) {
  const rows = shopeeFees.map(({ label, basisPoints, fixed }, index) => [
    label, fees?.[index], fixed ? `${money(fixed)}/đơn` : `${format(basisPoints / 100)}% giá bán`,
  ]);
  return <CostGroup id={id} title="Phí Shopee" rows={rows}
    subtotal={fees?.reduce((total, amount) => total + amount, 0)} />;
}
