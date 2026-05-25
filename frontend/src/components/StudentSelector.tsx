import styles from './StudentSelector.module.css';
import type { StudentOption } from '../types';

interface Props {
  students: StudentOption[];
  selectedId: number;
  onSelect: (id: number) => void;
}

export default function StudentSelector({ students, selectedId, onSelect }: Props) {
  return (
    <div className={styles.container}>
      <label htmlFor="student-select" className={styles.label}>
        👤 请选择学生：
      </label>
      <select
        id="student-select"
        className={styles.select}
        value={selectedId}
        onChange={(e) => onSelect(Number(e.target.value))}
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
