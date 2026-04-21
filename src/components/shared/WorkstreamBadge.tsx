import { colorMap } from '../../constants/colors';
import type { WorkstreamColor } from '../../store/types';

export function WorkstreamBadge({ label, color }: { label: string; color: WorkstreamColor }) {
  const col = colorMap[color] ?? colorMap.blue;
  return (
    <span style={{
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 4,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      background: col.bg,
      color: col.text,
    }}>
      {label}
    </span>
  );
}
