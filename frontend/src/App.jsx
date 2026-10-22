import { useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js';
import Login from './Login.jsx';
import Home from './Home.jsx';
import Exam from './Exam.jsx';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined: đang kiểm tra token đã lưu
  const [exam, setExam] = useState(null);
  const [settings, setSettings] = useState({ topic: '', count: 20, minutes: 30 });

  useEffect(() => {
    setUnauthorizedHandler(() => { setUser(null); setExam(null); });
    if (!getToken()) return setUser(null);
    let alive = true; // bỏ kết quả của lần gọi đã bị hủy (StrictMode gọi effect 2 lần khi dev)
    api('/api/me').then((me) => alive && setUser(me.username), () => alive && setUser(null));
    return () => { alive = false; };
  }, []);

  const login = ({ username, token }) => { setToken(token); setUser(username); };
  const logout = async () => {
    await api('/api/logout', { method: 'POST' }).catch(() => {});
    setToken(null);
    setUser(null);
  };

  if (user === undefined) return <main><p className="muted">Đang kết nối máy chủ…</p></main>;
  if (!user) return <Login onLogin={login} />;
  if (exam) return <Exam {...exam} onExit={() => setExam(null)} />;
  return <Home user={user} settings={settings} onSettings={setSettings} onStart={setExam} onLogout={logout} />;
}
