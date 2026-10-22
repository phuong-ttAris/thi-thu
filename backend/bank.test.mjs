import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readXlsxBank } from './bank.mjs';

// Đọc đề trong một tiến trình node mới (RAM trống), như lúc server khởi động lại.
const readInFreshProcess = (dir) => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e',
  `import { readXlsxBank } from ${JSON.stringify(pathToFileURL(path.join(import.meta.dirname, 'bank.mjs')).href)};
   process.stdout.write(JSON.stringify(await readXlsxBank(new URL(${JSON.stringify(dir.href)}))));`], { encoding: 'utf8' }));

test('readXlsxBank: khởi động lại thì đọc file JSON cache, Excel đổi thì đọc lại Excel và ghi đè JSON', async () => {
  const src = path.join(import.meta.dirname, 'de-thi');
  const xlsx = (await fs.readdir(src)).find((f) => f.endsWith('.xlsx') && !f.startsWith('~$'));
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'de-thi-'));
  const dir = pathToFileURL(tmp + path.sep);
  const cacheFile = path.join(tmp, '.bank-cache.json');
  try {
    await fs.copyFile(path.join(src, xlsx), path.join(tmp, 'a.xlsx'));
    const real = readInFreshProcess(dir);
    const saved = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
    assert.deepEqual(saved.bank, real, 'lần đầu đọc Excel xong thì ghi JSON (kèm đáp án)');
    assert.ok(Number.isInteger(saved.bank[0].answer));

    // Sửa nội dung JSON: nếu tiến trình mới trả về nội dung đã sửa thì nó đọc JSON chứ không đọc Excel.
    await fs.writeFile(cacheFile, JSON.stringify({ ...saved, bank: [{ id: 'tu-json' }] }));
    assert.deepEqual(readInFreshProcess(dir), [{ id: 'tu-json' }], 'Excel không đổi thì dùng JSON');

    const later = new Date(Date.now() + 60_000);
    await fs.utimes(path.join(tmp, 'a.xlsx'), later, later);
    assert.deepEqual(readInFreshProcess(dir), real, 'Excel đổi thì đọc lại Excel');
    assert.deepEqual(JSON.parse(await fs.readFile(cacheFile, 'utf8')).bank, real, 'và ghi đè JSON');

    await fs.writeFile(cacheFile, '{hỏng');
    assert.deepEqual(readInFreshProcess(dir), real, 'JSON hỏng thì đọc lại Excel');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('readXlsxBank: dùng lại kết quả khi file không đổi, đọc lại khi file đổi/thêm/xóa', async () => {
  const src = path.join(import.meta.dirname, 'de-thi');
  const xlsx = (await fs.readdir(src)).find((f) => f.endsWith('.xlsx') && !f.startsWith('~$'));
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'de-thi-'));
  const dir = pathToFileURL(tmp + path.sep);
  try {
    await fs.copyFile(path.join(src, xlsx), path.join(tmp, 'a.xlsx'));
    const first = await readXlsxBank(dir);
    assert.ok(first.length > 0);
    assert.equal(await readXlsxBank(dir), first, 'file không đổi thì trả lại đúng mảng đã đọc');

    const later = new Date(Date.now() + 60_000);
    await fs.utimes(path.join(tmp, 'a.xlsx'), later, later);
    const touched = await readXlsxBank(dir);
    assert.notEqual(touched, first, 'giờ sửa đổi thì đọc lại');
    assert.deepEqual(touched, first);

    await fs.copyFile(path.join(src, xlsx), path.join(tmp, 'b.xlsx'));
    assert.equal((await readXlsxBank(dir)).length, first.length * 2, 'thêm file thì đọc thêm');

    await fs.rm(path.join(tmp, 'a.xlsx'));
    await fs.rm(path.join(tmp, 'b.xlsx'));
    assert.deepEqual(await readXlsxBank(dir), [], 'xóa hết file thì không còn câu nào');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
