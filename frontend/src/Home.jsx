import { useEffect, useState } from 'react';
import { api } from './api.js';
import { shuffle } from './util.js';
import Header from './Header.jsx';
import History from './History.jsx';
import { SkeletonField, SkeletonRows } from './Skeleton.jsx';

export default function Home({ user, settings, onSettings, onStart, onLogout, bank, onBank, history, onHistory }) {
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0); // tăng để tải lại đề khi bấm "Thử lại"
  const set = (k) => (e) => onSettings({ ...settings, [k]: e.target.value });

  // Có đề trong cache (bank) thì hiện ngay; vẫn tải lại ngầm để nhận đề mới nếu file Excel vừa đổi.
  useEffect(() => {
    let alive = true; // bỏ kết quả của lần gọi đã bị hủy (StrictMode gọi effect 2 lần khi dev)
    setError('');
    api('/api/bank').then((b) => alive && onBank(b), (e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [attempt]);

  const userBox = <div className="user"><span>👤 {user}</span><button onClick={onLogout}>Đăng xuất</button></div>;

  // Tải đề lỗi (ví dụ máy chủ đang khởi động): báo lỗi kèm nút thử lại.
  if (!bank && error) {
    return (
      <main>
        <Header subtitle="Thi thử trắc nghiệm">{userBox}</Header>
        <section className="card loading" role="alert">
          <p className="err">Không tải được đề thi: {error}</p>
          <button className="pri" onClick={() => setAttempt((n) => n + 1)}>Thử lại</button>
        </section>
      </main>
    );
  }

  // Chưa đọc xong file Excel: hiện khung skeleton đúng bố cục thật, đọc xong mới thay bằng form và lịch sử.
  if (!bank) {
    return (
      <main aria-busy="true">
        <Header subtitle={<span className="sk sk-text" aria-hidden="true" />}>{userBox}</Header>
        <span className="sr-only" role="status">Đang tải đề thi…</span>
        <section className="card">
          <div className="settings"><SkeletonField wide /><SkeletonField /><SkeletonField /></div>
          <span className="sk sk-btn" aria-hidden="true" />
        </section>
        <section className="card">
          <h2>Lịch sử thi</h2>
          <SkeletonRows />
        </section>
      </main>
    );
  }

  const topics = new Map();
  for (const q of bank) topics.set(q.topic, (topics.get(q.topic) || 0) + 1);

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

  const info = bank.length ? `${bank.length} câu hỏi · ${topics.size} chủ đề` : 'Chưa có câu hỏi trong thư mục de-thi/ của backend.';

  return (
    <main>
      <Header subtitle={info}>{userBox}</Header>
      <section className="card">
        <div className="settings">
          <label className="field wide">Chủ đề
            <select value={settings.topic} onChange={set('topic')}>
              <option value="">Tất cả chủ đề ({bank.length} câu)</option>
              {[...topics].map(([name, n]) => <option key={name} value={name}>{name} ({n} câu)</option>)}
            </select>
          </label>
          <label className="field">Số câu <input type="number" min="1" value={settings.count} onChange={set('count')} /></label>
          <label className="field">Thời gian (phút) <input type="number" min="1" value={settings.minutes} onChange={set('minutes')} /></label>
        </div>
        <button className="pri big" disabled={!bank.length} onClick={start}>Bắt đầu làm bài</button>
      </section>
      <History rows={history} onRows={onHistory} />
    </main>
  );
}
