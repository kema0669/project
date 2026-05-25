import styles from './SuggestionPanel.module.css';

interface Props {
  suggestion: string;
}

export default function SuggestionPanel({ suggestion }: Props) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>💡 AI 学习建议</h3>
      <div className={styles.content}>
        <p className={styles.text}>{suggestion}</p>
      </div>
    </div>
  );
}
