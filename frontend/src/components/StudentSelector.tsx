import styles from './StudentSelector.module.css';
import type { ExamOption, StudentOption } from '../types';

interface Props {
  students: StudentOption[];
  exams: ExamOption[];
  selectedStudentId: number;
  selectedExamId: number;
  onStudentSelect: (id: number) => void;
  onExamSelect: (id: number) => void;
}

export default function StudentSelector({
  students,
  exams,
  selectedStudentId,
  selectedExamId,
  onStudentSelect,
  onExamSelect,
}: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.field}>
        <label htmlFor="student-select" className={styles.label}>
          学生
        </label>
        <select
          id="student-select"
          className={styles.select}
          value={selectedStudentId}
          onChange={(event) => onStudentSelect(Number(event.target.value))}
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.gradeName} · {student.className} · {student.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="exam-select" className={styles.label}>
          考试
        </label>
        <select
          id="exam-select"
          className={styles.select}
          value={selectedExamId}
          onChange={(event) => onExamSelect(Number(event.target.value))}
        >
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.examDate} · {exam.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
