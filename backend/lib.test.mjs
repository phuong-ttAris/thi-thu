import test from 'node:test';
import assert from 'node:assert/strict';
import { validQuestion, rowToQuestion, gradeExam, validUsername } from './lib.mjs';

test('gradeExam: chấm theo đáp án gốc, bỏ id lạ/trùng, picked sai kiểu = sai', () => {
  const bank = [{ id: 'a', answer: 2 }, { id: 'b', answer: 0 }, { id: 'c', answer: 1 }];
  const r = gradeExam(bank, [{ id: 'a', picked: 2 }, { id: 'a', picked: 2 }, { id: 'b', picked: '0' }, { id: 'c', picked: null }, { id: 'x', picked: 1 }, null]);
  assert.equal(r.correct, 1);
  assert.equal(r.total, 3);
  assert.deepEqual(r.key, { a: 2, b: 0, c: 1 });
});

test('validUsername', () => {
  assert.ok(validUsername('phuong.nt'));
  assert.ok(!validUsername('ab'));
  assert.ok(!validUsername('có dấu'));
  assert.ok(!validUsername(123));
});

test('rowToQuestion: cột Đáp án 1-4 ứng với A-D, chủ đề lấy từ cột Chủ đề, thiếu/sai thì bỏ dòng', () => {
  const row = { topic: ' CD ', question: ' Q? ', options: ['a', 'b', 'c', 'd'], answer: '3' };
  assert.deepEqual(rowToQuestion(row), { topic: 'CD', question: 'Q?', options: ['a', 'b', 'c', 'd'], answer: 2 });
  assert.equal(rowToQuestion({ ...row, answer: '' }), null);
  assert.equal(rowToQuestion({ ...row, answer: '5' }), null);
  assert.equal(rowToQuestion({ ...row, answer: 'A' }), null);
  assert.equal(rowToQuestion({ ...row, topic: '' }), null);
  assert.equal(rowToQuestion({ ...row, options: ['a', 'b', 'c', ' '] }), null);
});

test('validQuestion', () => {
  const q = { question: 'Q?', options: ['a', 'b', 'c', 'd'], answer: 3 };
  assert.ok(validQuestion(q));
  assert.ok(!validQuestion({ ...q, answer: 4 }));
  assert.ok(!validQuestion({ ...q, options: ['a', 'b', 'c'] }));
  assert.ok(!validQuestion({ ...q, options: ['a', 'b', 'c', ' '] }));
});
