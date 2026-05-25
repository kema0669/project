import type { KnowledgeMastery } from '../types';
import styles from './MasteryDetail.module.css';

interface Props {
  knowledges: KnowledgeMastery[];
  overallMastery: number;
}

function getRating(probability: number): { label: string; className: string } {
  if (probability >= 0.8) return { label: '优秀', className: styles.excellent };
  if (probability >= 0.5) return { label: '良好', className: styles.good };
  return { label: '薄弱', className: styles.weak };
}

export default function MasteryDetail({ knowledges, overallMastery }: Props) {
  const overallRating = getRating(overallMastery);

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>📋 诊断详情</h3>

      <div className={styles.overall}>
        <span className={styles.overallLabel}>综合掌握度</span>
        <span className={`${styles.overallValue} ${overallRating.className}`}>
          {(overallMastery * 100).toFixed(0)}%
        </span>
        <span className={`${styles.badge} ${overallRating.className}`}>
          {overallRating.label}
        </span>
      </div>

      <ul className={styles.list}>
        {knowledges.map((k) => {
          const rating = getRating(k.masteryProbability);
          const pct = (k.masteryProbability * 100).toFixed(0);

          return (
            <li key={k.knowledgePointId} className={styles.item}>
              <div className={styles.itemHeader}>
                <span className={styles.itemName}>{k.knowledgePointName}</span>
                <span className={`${styles.itemValue} ${rating.className}`}>
                  {pct}%
                </span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressFill} ${rating.className}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
