import { useEffect, useRef } from 'react';

// Popup tự dựng: confirm() gốc bị chặn ở một số trình duyệt nhúng.
// ask: { msg, yes, onYes } hoặc null.
export default function ConfirmDialog({ ask, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (ask && !d.open) d.showModal();
    else if (!ask && d.open) d.close();
  }, [ask]);

  return (
    <dialog ref={ref} onClose={onClose}>
      <p>{ask?.msg}</p>
      <div className="actions">
        <button onClick={onClose}>Ở lại</button>
        <button className="pri" onClick={() => { onClose(); ask.onYes(); }}>{ask?.yes}</button>
      </div>
    </dialog>
  );
}
