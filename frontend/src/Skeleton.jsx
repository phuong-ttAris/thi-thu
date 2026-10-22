// Khung xám nhấp nháy giữ chỗ cho nội dung đang tải, cùng bố cục với giao diện thật.
export function SkeletonField({ wide }) {
  return (
    <div className={`field${wide ? ' wide' : ''}`} aria-hidden="true">
      <span className="sk sk-label" />
      <span className="sk sk-input" />
    </div>
  );
}

export function SkeletonRows({ rows = 3 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <span key={i} className="sk sk-row" style={{ width: `${100 - i * 12}%` }} />)}
    </div>
  );
}
