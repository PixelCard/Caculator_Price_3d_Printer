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

export function ShopeeCostGroup({ id, fees, collapsible }) {
  const rows = shopeeFees.map(({ label, basisPoints, fixed }, index) => [
    label, fees?.[index], fixed ? `${money(fixed)}/đơn` : `${format(basisPoints / 100)}% giá bán`,
  ]);
  return <CostGroup id={id} title="Phí Shopee" rows={rows} collapsible={collapsible}
    subtotal={fees?.reduce((total, amount) => total + amount, 0)} />;
}

export function PageHeading({ title, children }) {
  return <div className="page-heading">
    <h1>{title}</h1>
    <div className="page-actions">{children}</div>
  </div>;
}

export function PriceSummary({ id, title, price, children }) {
  return <section className="sale" aria-labelledby={id}>
    <h2 id={id}>{title}</h2>
    <p className="sale-amount" aria-live="polite">{money(price)}</p>
    <div className="sale-details">{children}</div>
  </section>;
}

export function TabBar({ id, label, tabs, selected, onChange, className = '' }) {
  function handleKey(event, index) {
    const { key } = event;
    const last = tabs.length - 1;
    const targets = { ArrowLeft: index === 0 ? last : index - 1,
      ArrowRight: index === last ? 0 : index + 1, Home: 0, End: last };
    if (!Object.hasOwn(targets, key)) return;
    event.preventDefault();
    const next = targets[key];
    onChange(tabs[next].key);
    event.currentTarget.parentElement.children[next].focus();
  }

  return <div className={`tab-bar ${className}`} role="tablist" aria-label={label}>
    {tabs.map((tab, index) => (
      <button type="button" key={tab.key} role="tab" id={`${id}-tab-${tab.key}`}
        aria-selected={selected === tab.key} aria-controls={`${id}-panel-${tab.key}`}
        tabIndex={selected === tab.key ? 0 : -1}
        onClick={() => onChange(tab.key)} onKeyDown={(event) => handleKey(event, index)}>
        {tab.label}
        {tab.status && <span className="tab-status" data-status={tab.status === 'Lỗi' ? 'error' : 'missing'}>{tab.status}</span>}
      </button>
    ))}
  </div>;
}
