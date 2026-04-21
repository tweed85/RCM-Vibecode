import { useEffect, useState } from 'react';
import styles from './Toast.module.css';

let _showToast: (msg: string) => void = () => {};
export function showToast(msg: string) { _showToast(msg); }

export function Toast() {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    _showToast = (m: string) => {
      setMsg(m);
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 2200);
    };
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`${styles.toast} ${visible ? styles.visible : ''}`}>
      {msg}
    </div>
  );
}
