import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header';
import StudentSelector from './components/StudentSelector';
import RadarChart from './components/RadarChart';
import MasteryDetail from './components/MasteryDetail';
import TrendChart from './components/TrendChart';
import SubjectAnalysisPanel from './components/SubjectAnalysisPanel';
import KnowledgeGraph from './components/KnowledgeGraph';
import {
  fetchExams,
  fetchOverview,
  fetchStudents,
  fetchSubjectAnalysis,
  fetchSubjectKnowledgeAnalysis,
  fetchSubjectKnowledgeTrends,
  fetchTrends,
} from './data/mock';
import type {
  ExamOption,
  KnowledgeTrendPoint,
  LoadingState,
  StudentOption,
  StudentOverview,
  StudentTrends,
  SubjectAnalysis,
  SubjectKnowledgeAnalysis,
} from './types';
import styles from './App.module.css';

export default function App() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(0);
  const [selectedExamId, setSelectedExamId] = useState(0);
  const [selectedSubjectId, setSelectedSubjectId] = useState(0);
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [trends, setTrends] = useState<StudentTrends | null>(null);
  const [subjectAnalysis, setSubjectAnalysis] = useState<SubjectAnalysis | null>(null);
  const [knowledgeAnalysis, setKnowledgeAnalysis] = useState<SubjectKnowledgeAnalysis | null>(null);
  const [knowledgeTrends, setKnowledgeTrends] = useState<KnowledgeTrendPoint[]>([]);
  const [state, setState] = useState<LoadingState>('idle');

  useEffect(() => {
    Promise.all([fetchStudents(), fetchExams()])
      .then(([studentList, examList]) => {
        setStudents(studentList);
        setExams(examList);
        if (studentList.length > 0) setSelectedStudentId(studentList[0].id);
        if (examList.length > 0) setSelectedExamId(examList[examList.length - 1].id);
      })
      .catch(() => setState('error'));
  }, []);

  const loadOverview = useCallback(async (studentId: number, examId: number) => {
    if (!studentId || !examId) return;
    setState('loading');
    try {
      const [nextOverview, nextTrends] = await Promise.all([fetchOverview(studentId, examId), fetchTrends(studentId)]);
      setOverview(nextOverview);
      setTrends(nextTrends);
      setSelectedSubjectId((current) =>
        nextOverview.subjects.some((subject) => subject.subjectId === current)
          ? current
          : nextOverview.subjects[0]?.subjectId ?? 0
      );
      setState('success');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    loadOverview(selectedStudentId, selectedExamId);
  }, [selectedStudentId, selectedExamId, loadOverview]);

  useEffect(() => {
    if (!selectedStudentId || !selectedExamId || !selectedSubjectId) {
      setSubjectAnalysis(null);
      setKnowledgeAnalysis(null);
      setKnowledgeTrends([]);
      return;
    }
    Promise.all([
      fetchSubjectAnalysis(selectedStudentId, selectedExamId, selectedSubjectId),
      fetchSubjectKnowledgeAnalysis(selectedStudentId, selectedExamId, selectedSubjectId),
      fetchSubjectKnowledgeTrends(selectedStudentId, selectedSubjectId),
    ])
      .then(([nextSubjectAnalysis, nextKnowledgeAnalysis, nextKnowledgeTrends]) => {
        setSubjectAnalysis(nextSubjectAnalysis);
        setKnowledgeAnalysis(nextKnowledgeAnalysis);
        setKnowledgeTrends(nextKnowledgeTrends.trends);
      })
      .catch(() => {
        setSubjectAnalysis(null);
        setKnowledgeAnalysis(null);
        setKnowledgeTrends([]);
      });
  }, [selectedStudentId, selectedExamId, selectedSubjectId]);

  return (
    <div className={styles.app}>
      <Header />

      <StudentSelector
        students={students}
        exams={exams}
        selectedStudentId={selectedStudentId}
        selectedExamId={selectedExamId}
        onStudentSelect={setSelectedStudentId}
        onExamSelect={setSelectedExamId}
      />

      {state === 'loading' && <div className={styles.loading}>正在加载多学科成绩画像...</div>}
      {state === 'error' && <div className={styles.error}>加载失败，请确认后端服务已启动</div>}

      {state === 'success' && overview && trends && (
        <>
          <div className={styles.summaryBar}>
            <div>
              <span>学生</span>
              <strong>{overview.student.name}</strong>
            </div>
            <div>
              <span>年级/班级</span>
              <strong>
                {overview.student.gradeName} · {overview.student.className}
              </strong>
            </div>
            <div>
              <span>总分</span>
              <strong>
                {overview.totalScore}/{overview.totalFullScore}
              </strong>
            </div>
            <div>
              <span>排名</span>
              <strong>
                班 {overview.classRank} / 级 {overview.gradeRank}
              </strong>
            </div>
          </div>

          <TrendChart trends={trends} />

          <div className={styles.grid}>
            <RadarChart subjects={overview.subjects} />
            <MasteryDetail subjects={overview.subjects} />
          </div>

          <div className={styles.subjectBar}>
            <label htmlFor="subject-analysis-select">单科题目分析</label>
            <select
              id="subject-analysis-select"
              value={selectedSubjectId}
              onChange={(event) => setSelectedSubjectId(Number(event.target.value))}
            >
              {overview.subjects.map((subject) => (
                <option key={subject.subjectId} value={subject.subjectId}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </div>

          <SubjectAnalysisPanel analysis={subjectAnalysis} />
          <KnowledgeGraph analysis={knowledgeAnalysis} trends={knowledgeTrends} />
        </>
      )}
    </div>
  );
}
