import type { SubjectScoreSummary } from '../types';
import styles from './MasteryDetail.module.css';

interface Props {
  subjects: SubjectScoreSummary[];
}

function rating(rate: number): { label: string; className: string } {
  if (rate >= 0.85) return { label: '优势', className: styles.excellent };
  if (rate >= 0.7) return { label: '稳定', className: styles.good };
  return { label: '需提升', className: styles.weak };
}

export default function MasteryDetail({ subjects }: Props) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>各科成绩详情</h3>

      <ul className={styles.list}>
        {subjects.map((subject) => {
          const rate = subject.score / subject.totalScore;
          const current = rating(rate);
          const pct = Math.round(rate * 100);

          return (
            <li key={subject.subjectId} className={styles.item}>
              <div className={styles.itemHeader}>
                <span className={styles.itemName}>{subject.subjectName}</span>
                <span className={`${styles.itemValue} ${current.className}`}>
                  {subject.score}/{subject.totalScore}
                </span>
              </div>
              <div className={styles.progressBar}>
                <div className={`${styles.progressFill} ${current.className}`} style={{ width: `${pct}%` }} />
              </div>
              <div className={styles.overallLabel}>
                {current.label} · 班级第 {subject.classRank ?? '-'} · 年级第 {subject.gradeRank ?? '-'}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
