import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.icon}>🎓</div>
      <h1 className={styles.title}>智能化认知诊断 MVP</h1>
      <p className={styles.subtitle}>基于 DINA 模型的个性化学习分析</p>
    </header>
  );
}
