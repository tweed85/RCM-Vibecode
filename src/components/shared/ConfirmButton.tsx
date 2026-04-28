import { useState, useEffect, useRef } from 'react';

interface Props {
  onConfirm: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  confirmLabel?: string;
  'aria-label'?: string;
}

export function ConfirmButton({ onConfirm, children, className, style, confirmLabel = 'Delete?', 'aria-label': ariaLabel }: Props) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) {
      timer.current = setTimeout(() => setConfirming(false), 3000);
      // Move focus to the confirm button so keyboard users hear the prompt
      confirmBtnRef.current?.focus();
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [confirming]);

  if (confirming) {
    return (
      <span role="alert" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <button
          ref={confirmBtnRef}
          style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
            background: 'var(--red)', color: 'white', border: 'none', fontWeight: 600,
          }}
          onClick={() => { setConfirming(false); onConfirm(); }}
        >{confirmLabel}</button>
        <button
          style={{
            fontSize: 11, padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
            background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)',
          }}
          onClick={() => setConfirming(false)}
        >Cancel</button>
      </span>
    );
  }

  return (
    <button className={className} style={style} aria-label={ariaLabel} onClick={() => setConfirming(true)}>
      {children}
    </button>
  );
}
