import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import ConfirmDialog from './ConfirmDialog.jsx';

const pad = (n) => String(n).padStart(2, '0');

export default function Exam({ questions, topic, minutes, onExit }) {
  const [startAt] = useState(Date.now);
  const endAt = startAt + minutes * 60000;
  const [now, setNow] = useState(Date.now);
  const [picks, setPicks] = useState(() => questions.map(() => null)); // vị trí phương án đang hiện, hoặc null
  const [locked, setLocked] = useState(false); // đã bấm nộp: khóa bài làm
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [ask, setAsk] = useState(null);
  const sending = useRef(false);

  const left = Math.max(0, endAt - now);
  const done = picks.filter((p) => p !== null).length;

  useEffect(() => {
    if (locked) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [locked]);

  // Nộp lên server chấm và lưu; lỗi mạng thì cho nộp lại, bài làm giữ nguyên.
  async function submit() {
    if (sending.current || result) return;
    sending.current = true;
    setAsk(null);
    setLocked(true);
    setError('');
    try {
      setResult(await api('/api/results', {
        method: 'POST',
        body: {
          topic,
          durationSec: (Math.min(Date.now(), endAt) - startAt) / 1000,
          answers: questions.map((q, i) => ({ id: q.id, picked: picks[i] === null ? null : q.order[picks[i]] })),
        },
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      sending.current = false;
      window.scrollTo(0, 0);
    }
  }

  // Hết giờ thì tự nộp.
  useEffect(() => { if (left === 0 && !locked) submit(); }, [left, locked]);

  const askSubmit = () => (done === questions.length ? submit()
    : setAsk({ msg: `Bạn mới làm ${done}/${questions.length} câu. Vẫn nộp bài?`, yes: 'Nộp bài', onYes: submit }));
  // Nút luôn hiện trên màn hình nên hỏi lại để tránh bấm nhầm mất bài chưa lưu.
  const askExit = () => (result ? onExit() : setAsk({ msg: 'Bài làm chưa được lưu. Vẫn về trang chính?', yes: 'Thoát', onYes: onExit }));

  return (
    <main>
      <div id="bar">
        <div className="bar-row">
          <button onClick={askExit}>← Trang chính</button>
          <span className={`timer${left < 60000 ? ' warn' : ''}`}>⏱ {pad(Math.floor(left / 60000))}:{pad(Math.floor(left / 1000) % 60)}</span>
          {!locked && <button className="pri" onClick={askSubmit}>Nộp bài</button>}
        </div>
        <div className="meter"><div className="meter-fill" style={{ width: `${(done / questions.length) * 100}%` }} /></div>
        <div className="muted progress">Đã làm {done}/{questions.length} câu</div>
      </div>

      {locked && (
        <section className="card result">
          {result ? (
            <>
              <div className="score">{result.score.toFixed(1)} điểm</div>
              <div className="muted">Đúng {result.correct}/{result.total} câu · đã lưu vào lịch sử</div>
            </>
          ) : error ? (
            <>
              <p className="err">Nộp bài lỗi: {error}</p>
              <button className="pri" onClick={submit}>Nộp lại</button>
            </>
          ) : <p className="muted">Đang chấm bài…</p>}
        </section>
      )}

      {questions.map((q, i) => {
        const right = result ? q.order.indexOf(result.key[q.id]) : -1;
        return (
          <div className="q" key={q.id}>
            <p><span>Câu {i + 1}. </span>{q.question}</p>
            {q.order.map((orig, j) => (
              <label key={j} className={`opt${j === right ? ' ok' : result && j === picks[i] ? ' bad' : ''}`}>
                <input type="radio" name={`q${i}`} checked={picks[i] === j} disabled={locked}
                  onChange={() => setPicks((p) => p.map((v, k) => (k === i ? j : v)))} />
                <span className="letter">{'ABCD'[j]}</span>
                <span>{q.options[orig]}</span>
              </label>
            ))}
          </div>
        );
      })}

      <ConfirmDialog ask={ask} onClose={() => setAsk(null)} />
    </main>
  );
}
