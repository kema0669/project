import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import StudentSelector from './components/StudentSelector';
import RadarChart from './components/RadarChart';
import KnowledgeGraph from './components/KnowledgeGraph';
import MasteryDetail from './components/MasteryDetail';
import SuggestionPanel from './components/SuggestionPanel';
import { mockStudents, fetchDiagnosisResult } from './data/mock';
import type { DiagnosisResult, LoadingState } from './types';
import styles from './App.module.css';

function generateSuggestion(result: DiagnosisResult): string {
  const weakPoints = result.knowledges
    .filter((k) => k.masteryProbability < 0.5)
    .map((k) => k.knowledgePointName);

  const strongPoints = result.knowledges
    .filter((k) => k.masteryProbability >= 0.8)
    .map((k) => k.knowledgePointName);

  if (weakPoints.length === 0) {
    return `🎉 ${result.studentName}的整体表现非常出色！所有知识点的掌握度均在80%以上。建议适当进行拓展性练习，挑战更高难度的综合应用题，保持领先优势。`;
  }

  if (strongPoints.length === 0) {
    return `📚 ${result.studentName}目前在各知识点的掌握上均有较大提升空间。建议从最基础的「${result.knowledges[0].knowledgePointName}」开始，循序渐进地进行系统复习，夯实根基后再逐步推进。`;
  }

  return `👍 ${result.studentName}在「${strongPoints.join('、')}」方面表现优秀，但在「${weakPoints.join('、')}」上还需加强。建议优先针对薄弱环节进行专项训练：先回顾相关基础概念，再通过针对性练习题巩固，最后尝试中等难度的综合题进行检验。`;
}

export default function App() {
  const [selectedId, setSelectedId] = useState(mockStudents[0].id);
  const [state, setState] = useState<LoadingState>('idle');
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const loadDiagnosis = useCallback(async (studentId: number) => {
    setState('loading');
    try {
      const data = await fetchDiagnosisResult(studentId);
      setResult(data);
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
        students={mockStudents}
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
            <SuggestionPanel suggestion={generateSuggestion(result)} />
          </div>
        </>
      )}
    </div>
  );
}
