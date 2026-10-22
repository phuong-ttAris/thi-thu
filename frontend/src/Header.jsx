export default function Header({ subtitle, children }) {
  return (
    <header className="top">
      <img src="/icon.svg" alt="" width="48" height="48" />
      <div><h1>Thi thử</h1><div className="muted">{subtitle}</div></div>
      {children}
    </header>
  );
}
