import { useEffect, useState } from 'react';
import { api } from './api.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import { SkeletonRows } from './Skeleton.jsx';

const fmtDuration = (s) => (s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
const fmtDate = (d) => new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

// rows/onRows: lịch sử cache ở App. Có cache thì hiện ngay, vẫn tải lại ngầm (ví dụ để thấy bài vừa nộp).
export default function History({ rows, onRows }) {
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [ask, setAsk] = useState(null);

  useEffect(() => {
    let alive = true; // bỏ kết quả của lần gọi đã bị hủy (StrictMode gọi effect 2 lần khi dev)
    api('/api/results').then((r) => alive && onRows(r), (e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  // id: xóa một bài; không có id: xóa hết.
  async function remove(id) {
    setDeleteError('');
    try {
      await api(id ? `/api/results?id=${id}` : '/api/results', { method: 'DELETE' });
      onRows((rs) => (id ? rs.filter((r) => r.id !== id) : []));
    } catch (e) {
      setDeleteError(`Không xóa được: ${e.message}`);
    }
  }

  let body;
  if (!rows && error) body = `Không tải được lịch sử: ${error}`; // tải lại ngầm lỗi thì giữ dữ liệu cache
  else if (!rows) body = <><span className="sr-only" role="status">Đang tải lịch sử…</span><SkeletonRows /></>;
  else if (!rows.length) body = 'Chưa có bài thi nào.';
  else {
    const avg = rows.reduce((s, r) => s + r.score, 0) / rows.length;
    body = (
      <>
        {rows.length} lần thi · điểm trung bình {avg.toFixed(1)}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ngày thi</th><th>Chủ đề</th><th className="num">Điểm</th><th className="num">Đúng</th><th className="num dur">Thời gian</th>
                <th><span className="sr-only">Xóa</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td className="topic">{r.topic}</td>
                  <td className={`num ${r.score >= 5 ? 'pass' : 'fail'}`}>{r.score.toFixed(1)}</td>
                  <td className="num">{r.correct}/{r.total}</td>
                  <td className="num dur">{fmtDuration(r.durationSec)}</td>
                  <td className="num">
                    <button className="icon-btn" title="Xóa bài thi này" aria-label={`Xóa bài thi ${r.topic} lúc ${fmtDate(r.createdAt)}`}
                      onClick={() => setAsk({ msg: `Xóa bài thi "${r.topic}" lúc ${fmtDate(r.createdAt)} khỏi lịch sử?`, yes: 'Xóa', onYes: () => remove(r.id) })}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Lịch sử thi</h2>
        {rows?.length > 0 && (
          <button className="danger-link" onClick={() => setAsk({ msg: `Xóa toàn bộ ${rows.length} bài thi trong lịch sử? Không thể hoàn tác.`, yes: 'Xóa tất cả', onYes: () => remove() })}>
            Xóa tất cả
          </button>
        )}
      </div>
      <div className="muted">{body}</div>
      {deleteError && <p className="err" role="alert">{deleteError}</p>}
      <ConfirmDialog ask={ask} onClose={() => setAsk(null)} />
    </section>
  );
}
