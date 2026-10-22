import { useEffect, useState } from 'react';
import { api } from './api.js';
import { shuffle } from './util.js';
import Header from './Header.jsx';
import History from './History.jsx';

export default function Home({ user, settings, onSettings, onStart, onLogout }) {
  const [bank, setBank] = useState(null);
  const [error, setError] = useState('');
  const set = (k) => (e) => onSettings({ ...settings, [k]: e.target.value });

  useEffect(() => {
    let alive = true; // bỏ kết quả của lần gọi đã bị hủy (StrictMode gọi effect 2 lần khi dev)
    api('/api/bank').then((b) => alive && setBank(b), (e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  const topics = new Map();
  for (const q of bank ?? []) topics.set(q.topic, (topics.get(q.topic) || 0) + 1);

  function start() {
    const pool = bank.filter((q) => !settings.topic || q.topic === settings.topic);
    const n = Math.max(1, Math.min(pool.length, Number(settings.count) || 20));
    onStart({
      // order[j] = chỉ số phương án gốc đang hiện ở vị trí j (server chấm theo chỉ số gốc).
      questions: shuffle(pool).slice(0, n).map((q) => ({ ...q, order: shuffle([0, 1, 2, 3]) })),
      topic: settings.topic || 'Tất cả chủ đề',
      minutes: Number(settings.minutes) || 30,
    });
  }

  const info = error ? `Không đọc được đề: ${error}`
    : !bank ? 'Đang đọc đề…'
      : bank.length ? `${bank.length} câu hỏi · ${topics.size} chủ đề` : 'Chưa có câu hỏi trong thư mục de-thi/ của backend.';

  return (
    <main>
      <Header subtitle={info}>
        <div className="user"><span>👤 {user}</span><button onClick={onLogout}>Đăng xuất</button></div>
      </Header>
      <section className="card">
        <div className="settings">
          <label className="field wide">Chủ đề
            <select value={settings.topic} onChange={set('topic')}>
              <option value="">Tất cả chủ đề ({bank?.length ?? 0} câu)</option>
              {[...topics].map(([name, n]) => <option key={name} value={name}>{name} ({n} câu)</option>)}
            </select>
          </label>
          <label className="field">Số câu <input type="number" min="1" value={settings.count} onChange={set('count')} /></label>
          <label className="field">Thời gian (phút) <input type="number" min="1" value={settings.minutes} onChange={set('minutes')} /></label>
        </div>
        <button className="pri big" disabled={!bank?.length} onClick={start}>Bắt đầu làm bài</button>
      </section>
      <History />
    </main>
  );
}
