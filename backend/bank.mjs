import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { rowToQuestion } from './lib.mjs';

const XLSX_DIR = new URL('./de-thi/', import.meta.url);
const COLS = ['Chủ đề', 'Câu hỏi', 'A', 'B', 'C', 'D', 'Đáp án'];

// Đề: mỗi file .xlsx trong de-thi/. Chỉ đọc sheet có dòng 1 là tiêu đề đủ các cột COLS (tìm cột theo tên),
// các sheet khác (ghi chú, nháp) bị bỏ qua. Đọc lại mỗi lần để sửa Excel là có hiệu lực ngay.
export async function readXlsxBank() {
  const files = await fs.readdir(XLSX_DIR).catch((e) => (e.code === 'ENOENT' ? [] : Promise.reject(e)));
  const out = [];
  for (const f of files.filter((f) => f.endsWith('.xlsx') && !f.startsWith('~$'))) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(fileURLToPath(new URL(f, XLSX_DIR)));
    wb.eachSheet((ws) => {
      const col = {};
      // NFC: tiêu đề tiếng Việt gõ ở máy khác có thể lưu dạng Unicode tổ hợp
      ws.getRow(1).eachCell((c, i) => { col[c.text.trim().normalize('NFC')] = i; });
      if (!COLS.every((k) => col[k])) return;
      ws.eachRow((row, r) => {
        if (r === 1) return;
        const text = (k) => row.getCell(col[k]).text;
        const q = rowToQuestion({ topic: text('Chủ đề'), question: text('Câu hỏi'), options: ['A', 'B', 'C', 'D'].map(text), answer: text('Đáp án') });
        if (q) out.push({ id: `${f}:${ws.name}:${r}`, ...q });
      });
    });
  }
  return out;
}
