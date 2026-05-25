import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import StudentSelector from './components/StudentSelector';
import RadarChart from './components/RadarChart';
import KnowledgeGraph from './components/KnowledgeGraph';
import MasteryDetail from './components/MasteryDetail';
import SuggestionPanel from './components/SuggestionPanel';
import { fetchStudents, fetchDiagnosisResult, fetchSuggestion } from './data/mock';
import type { DiagnosisResult, LoadingState, StudentOption } from './types';
import styles from './App.module.css';

export default function App() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedId, setSelectedId] = useState(1);
  const [state, setState] = useState<LoadingState>('idle');
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [suggestion, setSuggestion] = useState('');

  // Stage 4: 加载学生列表
  useEffect(() => {
    fetchStudents()
      .then((list) => {
        setStudents(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => setState('error'));
  }, []);

  const loadDiagnosis = useCallback(async (studentId: number) => {
    setState('loading');
    try {
      const data = await fetchDiagnosisResult(studentId);
      const sugg = await fetchSuggestion(data);
      setResult(data);
      setSuggestion(sugg);
      setState('success');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    loadDiagnosis(selectedId);
  }, [selectedId, loadDiagnosis]);

  return (
    <div className={styles.app}>
      <Header />

      <StudentSelector
        students={students}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {state === 'loading' && (
        <div className={styles.loading}>⏳ 正在分析学生认知画像...</div>
      )}

      {state === 'error' && (
        <div className={styles.error}>❌ 分析失败，请重试</div>
      )}

      {state === 'success' && result && (
        <>
          <div className={styles.grid}>
            <RadarChart knowledges={result.knowledges} />
            <KnowledgeGraph knowledges={result.knowledges} />
          </div>

          <div className={styles.grid}>
            <MasteryDetail
              knowledges={result.knowledges}
              overallMastery={result.overallMastery}
            />
            <SuggestionPanel suggestion={suggestion} />
          </div>
        </>
      )}
    </div>
  );
}
