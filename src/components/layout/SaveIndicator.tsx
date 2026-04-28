import { useEffect, useState } from 'react';

let _trigger: () => void = () => {};
export function triggerSaveIndicator() { _trigger(); }

export function SaveIndicator() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    _trigger = () => {
      setVisible(true);
      clearTimeout(t);
      t = setTimeout(() => setVisible(false), 1800);
    };
    return () => clearTimeout(t);
  }, []);

  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      style={{
        fontSize: 12,
        color: 'rgba(255,255,255,0.65)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s',
        pointerEvents: 'none',
      }}
    >
      {visible ? 'Saved' : ''}
    </span>
  );
}
