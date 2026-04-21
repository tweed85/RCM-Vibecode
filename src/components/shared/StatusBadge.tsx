import { statusColors, statusBgColors } from '../../constants/colors';
import { statusLabels } from '../../constants/enums';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 4,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      background: statusBgColors[status] ?? '#edf1f5',
      color: statusColors[status] ?? '#646464',
    }}>
      {statusLabels[status] ?? status}
    </span>
  );
}
