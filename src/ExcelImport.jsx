import React, { useRef, useState } from 'react';
import { importWorkbook } from './excel-import.js';

export default function ExcelImport({ fields, mode, onImport }) {
  const fileInput = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function readFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setFailed(false);
    setMessage('Đang đọc Excel…');
    try {
      if (!/\.xlsx$/i.test(file.name)) {
        setMessage('Chọn tệp Excel có đuôi .xlsx.');
        setFailed(true);
        return;
      }
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const result = importWorkbook(workbook, fields, mode);
      if (!result) {
        setMessage('Chưa tìm thấy thông số phù hợp. Kiểm tra tên các ô hoặc chọn đúng bảng tính.');
        setFailed(true);
        return;
      }
      const count = Object.keys(result.inputs).length;
      const parts = [];
      if (count) parts.push(`${count} thông số`);
      if (result.boxes.length) parts.push(`${result.boxes.length} Box`);
      if (parts.length) onImport(result);
      const summary = parts.length ? `Đã nhập ${parts.join(' và ')} từ Excel.` : 'Chưa nhập được dữ liệu hợp lệ.';
      const notes = [];
      if (count && count < fields.length) notes.push(`Kiểm tra ${fields.length - count} ô chưa được nhập từ file.`);
      if (result.invalidCount) notes.push(`Có ${result.invalidCount} thông số sai định dạng.`);
      if (result.invalidBoxes) notes.push('Kiểm tra kích thước và số chi tiết trong bảng Box.');
      if (result.boxQuantityIssue === 'missing-column') notes.push('Bảng Box thiếu cột Số Box giống nhau.');
      if (result.boxQuantityIssue === 'invalid-value') notes.push('Nhập số nguyên từ 1 trở lên ở cột Số Box giống nhau.');
      setMessage([summary, ...notes].join(' '));
      setFailed(!parts.length || Boolean(notes.length));
    } catch {
      setMessage('Không đọc được tệp Excel. Hãy mở tệp trong Excel và lưu lại dưới dạng .xlsx.');
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="excel-import">
      <input ref={fileInput} type="file" accept=".xlsx" hidden onChange={readFile} />
      <button type="button" className="foam-button" disabled={busy} onClick={() => fileInput.current.click()}>
        {busy ? 'Đang đọc Excel…' : 'Nhập Excel'}
      </button>
      <p className={failed ? 'error' : 'foam-note'} role="status">{message || 'Chọn tệp .xlsx để điền các thông số có trong file.'}</p>
    </div>
  );
}
