import { useState } from 'react';
import { api } from './api.js';
import Header from './Header.jsx';

// Cùng quy tắc với validUsername ở backend (backend vẫn kiểm tra lại).
const USERNAME_RE = /^[A-Za-z0-9._-]{3,32}$/;

const EyeIcon = ({ off }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </svg>
);

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isRegister = mode === 'register';

  function switchMode(next) {
    setMode(next);
    setError('');
    setPassword('');
    setConfirm('');
  }

  async function submit(e) {
    e.preventDefault();
    const name = username.trim();
    if (isRegister) {
      if (!USERNAME_RE.test(name)) return setError('Tên đăng nhập 3–32 ký tự: chữ không dấu, số, dấu . _ -');
      if (password !== confirm) return setError('Mật khẩu nhập lại không khớp');
    }
    setBusy(true);
    setError('');
    try {
      onLogin(await api(`/api/${mode}`, { method: 'POST', body: { username: name, password } }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main>
      <Header subtitle={isRegister ? 'Tạo tài khoản để làm bài và lưu lịch sử thi.' : 'Đăng nhập để làm bài và lưu lịch sử thi.'} />
      <form className="card auth" onSubmit={submit}>
        <h2>{isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập'}</h2>
        <div className="settings">
          <label className="field wide">Tên đăng nhập
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={32} />
            {isRegister && <span className="hint">3–32 ký tự: chữ không dấu, số, dấu . _ -</span>}
          </label>
          <label className="field wide">Mật khẩu
            <span className="pw-wrap">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={6} maxLength={200} />
              <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPw} title={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                <EyeIcon off={showPw} />
              </button>
            </span>
            {isRegister && <span className="hint">Tối thiểu 6 ký tự</span>}
          </label>
          {isRegister && (
            <label className="field wide">Nhập lại mật khẩu
              <input type={showPw ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required minLength={6} maxLength={200} />
            </label>
          )}
        </div>
        <p className="err" role="alert">{error}</p>
        <button className="pri big" disabled={busy}>{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
        <p className="switch muted">
          {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
          <button type="button" className="link" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
            {isRegister ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </p>
      </form>
    </main>
  );
}
