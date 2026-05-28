import type {
  ExamOption,
  KnowledgeTrendResponse,
  StudentOption,
  StudentOverview,
  StudentTrends,
  SubjectAnalysis,
  SubjectKnowledgeAnalysis,
} from '../types';

export async function fetchStudents(): Promise<StudentOption[]> {
  const res = await fetch('/api/students');
  if (!res.ok) throw new Error('Failed to fetch students');
  const data = (await res.json()) as { students: StudentOption[] };
  return data.students;
}

export async function fetchExams(): Promise<ExamOption[]> {
  const res = await fetch('/api/exams');
  if (!res.ok) throw new Error('Failed to fetch exams');
  const data = (await res.json()) as { exams: ExamOption[] };
  return data.exams;
}

export async function fetchOverview(studentId: number, examId: number): Promise<StudentOverview> {
  const res = await fetch(`/api/students/${studentId}/exams/${examId}/overview`);
  if (!res.ok) throw new Error('Failed to fetch overview');
  return res.json() as Promise<StudentOverview>;
}

export async function fetchTrends(studentId: number): Promise<StudentTrends> {
  const res = await fetch(`/api/students/${studentId}/trends`);
  if (!res.ok) throw new Error('Failed to fetch trends');
  return res.json() as Promise<StudentTrends>;
}

export async function fetchSubjectAnalysis(
  studentId: number,
  examId: number,
  subjectId: number
): Promise<SubjectAnalysis> {
  const res = await fetch(`/api/students/${studentId}/exams/${examId}/subjects/${subjectId}`);
  if (!res.ok) throw new Error('Failed to fetch subject analysis');
  return res.json() as Promise<SubjectAnalysis>;
}

export async function fetchSubjectKnowledgeAnalysis(
  studentId: number,
  examId: number,
  subjectId: number
): Promise<SubjectKnowledgeAnalysis> {
  const res = await fetch(`/api/students/${studentId}/exams/${examId}/subjects/${subjectId}/knowledge`);
  if (!res.ok) throw new Error('Failed to fetch subject knowledge analysis');
  return res.json() as Promise<SubjectKnowledgeAnalysis>;
}

export async function fetchSubjectKnowledgeTrends(
  studentId: number,
  subjectId: number
): Promise<KnowledgeTrendResponse> {
  const res = await fetch(`/api/students/${studentId}/subjects/${subjectId}/knowledge-trends`);
  if (!res.ok) throw new Error('Failed to fetch subject knowledge trends');
  return res.json() as Promise<KnowledgeTrendResponse>;
}
