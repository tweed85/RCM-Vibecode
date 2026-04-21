import styles from './WbsBadge.module.css';

export function WbsBadge({ wbs, small }: { wbs: string; small?: boolean }) {
  return (
    <span className={`${styles.badge} ${small ? styles.small : ''}`}>{wbs}</span>
  );
}
