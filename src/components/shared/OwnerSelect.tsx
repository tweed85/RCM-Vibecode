import { useRef, useState, useCallback } from 'react';
import { useProjectStore } from '../../store/useProjectStore';

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function OwnerSelect({ values, onChange, placeholder = 'Add assignee…' }: Props) {
  const [input, setInput] = useState('');
  const idRef = useRef(`osl-${Math.random().toString(36).slice(2, 7)}`);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { amRoster, projects, activeProject } = useProjectStore();
  const clientRoster = projects[activeProject].config.clientRoster ?? [];

  const suggestions = Array.from(new Set([
    ...amRoster.map(p => p.name),
    ...clientRoster.map(p => p.name),
  ])).filter(n => !values.includes(n)).sort();

  const add = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setInput('');
  }, [values, onChange]);

  function remove(name: string) {
    onChange(values.filter(v => v !== name));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInput(val);
    // Datalist selection fires onChange with the full value immediately.
    // Detect this by checking if the value matches an option exactly,
    // then commit right away so the subsequent blur doesn't double-add.
    const datalist = document.getElementById(idRef.current) as HTMLDataListElement | null;
    if (datalist) {
      const isExactMatch = Array.from(datalist.options).some(o => o.value === val);
      if (isExactMatch) {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        add(val);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      add(input);
    } else if (e.key === 'Tab' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        add(input);
      }
    } else if (e.key === 'Backspace' && !input && values.length) {
      remove(values[values.length - 1]);
    }
  }

  function handleBlur() {
    // Defer so datalist selection's onChange fires first and can cancel this
    blurTimerRef.current = setTimeout(() => {
      if (input.trim()) add(input);
    }, 150);
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 8px',
      border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)',
      minHeight: 36, alignItems: 'center', cursor: 'text',
    }}>
      {values.map(v => (
        <span key={v} style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 12, padding: '2px 6px 2px 8px',
          background: 'var(--hover)', borderRadius: 99, color: 'var(--text)',
        }}>
          {v}
          <button
            type="button"
            onClick={() => remove(v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontSize: 14, lineHeight: 1, color: 'var(--text3)' }}
          >×</button>
        </span>
      ))}
      <input
        list={idRef.current}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={values.length === 0 ? placeholder : ''}
        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', flex: 1, minWidth: 80 }}
        autoComplete="off"
      />
      <datalist id={idRef.current}>
        {suggestions.map(n => <option key={n} value={n} />)}
      </datalist>
    </div>
  );
}
