export function validQuestion(q) {
  return typeof q?.question === 'string' && q.question.trim() !== ''
    && Array.isArray(q.options) && q.options.length === 4
    && q.options.every((o) => typeof o === 'string' && o.trim() !== '')
    && Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3;
}

export const validUsername = (u) => typeof u === 'string' && /^[A-Za-z0-9._-]{3,32}$/.test(u);

// Chấm theo đáp án trong đề. answers: [{ id, picked }], picked là chỉ số phương án gốc 0-3 hoặc null.
// Bỏ id lạ và id trùng; key trả về đáp án đúng của các câu đã chấm để hiện lại cho thí sinh.
export function gradeExam(bank, answers) {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const key = {};
  let correct = 0;
  for (const a of answers) {
    const q = byId.get(a?.id);
    if (!q || Object.hasOwn(key, q.id)) continue;
    key[q.id] = q.answer;
    if (a.picked === q.answer) correct++;
  }
  return { correct, total: Object.keys(key).length, key };
}

// Một dòng Excel (text của các ô): cột "Đáp án" là số 1-4 ứng với phương án A-D. Thiếu/sai thì bỏ dòng.
export function rowToQuestion({ topic, question, options, answer }) {
  if (!/^[1-4]$/.test(answer.trim()) || !topic.trim()) return null;
  const out = { topic: topic.trim(), question: question.trim(), options: options.map((o) => o.trim()), answer: Number(answer) - 1 };
  return validQuestion(out) ? out : null;
}
