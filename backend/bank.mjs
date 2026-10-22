import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { rowToQuestion } from './lib.mjs';

const XLSX_DIR = new URL('./de-thi/', import.meta.url);
const COLS = ['Chủ đề', 'Câu hỏi', 'A', 'B', 'C', 'D', 'Đáp án'];
const CACHE_FILE = '.bank-cache.json'; // nằm cạnh file Excel, không commit (.gitignore)

// Đọc Excel tốn ~2s trên máy yếu (Render free). Hai tầng cache, đều gắn với key = tên + kích thước + giờ sửa
// của các file Excel, nên sửa Excel vẫn có hiệu lực ngay ở request kế tiếp:
// - RAM: dùng suốt lúc server chạy.
// - File JSON (đề + đáp án): server khởi động lại chỉ đọc JSON (vài ms) thay vì đọc lại Excel.
const cache = new Map(); // dir.href -> { key, bank: Promise<question[]> }

// Đề: mỗi file .xlsx trong dir. Chỉ đọc sheet có dòng 1 là tiêu đề đủ các cột COLS (tìm cột theo tên),
// các sheet khác (ghi chú, nháp) bị bỏ qua. Mảng trả về dùng chung giữa các request: chỉ đọc, không sửa.
export async function readXlsxBank(dir = XLSX_DIR) {
  const files = (await fs.readdir(dir).catch((e) => (e.code === 'ENOENT' ? [] : Promise.reject(e))))
    .filter((f) => f.endsWith('.xlsx') && !f.startsWith('~$'));
  const stats = await Promise.all(files.map((f) => fs.stat(new URL(f, dir))));
  const key = files.map((f, i) => `${f}:${stats[i].size}:${stats[i].mtimeMs}`).join('|');
  const hit = cache.get(dir.href);
  if (hit?.key === key) return hit.bank;
  // Lưu promise để các request đến cùng lúc dùng chung một lần đọc; đọc lỗi thì bỏ cache để lần sau đọc lại.
  const bank = loadOrParse(dir, files, key).catch((e) => { if (cache.get(dir.href)?.bank === bank) cache.delete(dir.href); throw e; });
  cache.set(dir.href, { key, bank });
  return bank;
}

async function loadOrParse(dir, files, key) {
  const file = new URL(CACHE_FILE, dir);
  const saved = await fs.readFile(file, 'utf8').then(JSON.parse).catch(() => null); // chưa có / hỏng thì đọc lại Excel
  if (saved?.key === key && Array.isArray(saved.bank)) return saved.bank;
  const bank = await parseFiles(dir, files);
  // Chỉ là cache: ghi lỗi (ví dụ ổ chỉ đọc) thì vẫn dùng kết quả vừa đọc.
  await fs.writeFile(file, JSON.stringify({ key, bank })).catch((e) => console.error('Không ghi được cache đề:', e.message));
  return bank;
}

async function parseFiles(dir, files) {
  const out = [];
  for (const f of files) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(fileURLToPath(new URL(f, dir)));
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
