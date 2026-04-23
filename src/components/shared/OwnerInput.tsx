import { useProjectStore } from '../../store/useProjectStore';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  style?: React.CSSProperties;
  placeholder?: string;
  listId?: string;
}

export function OwnerInput({ value, onChange, onBlur, style, placeholder = 'Assignee name', listId = 'roster-list' }: Props) {
  const { amRoster, projects, activeProject } = useProjectStore();
  const clientRoster = projects[activeProject].config.clientRoster ?? [];

  const names = Array.from(new Set([
    ...amRoster.map(p => p.name),
    ...clientRoster.map(p => p.name),
  ])).sort();

  const id = `${listId}-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <>
      <input
        list={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        style={style}
        autoComplete="off"
      />
      <datalist id={id}>
        {names.map(n => <option key={n} value={n} />)}
      </datalist>
    </>
  );
}
