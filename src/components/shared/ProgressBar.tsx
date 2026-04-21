export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 3, background: 'var(--surface2)', margin: '0 0 4px', borderRadius: 2 }}>
      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: 'var(--green)', transition: 'width 0.3s' }} />
    </div>
  );
}
