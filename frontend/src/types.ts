export type Role = 'teacher' | 'student';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  displayName: string;
  studentId?: number;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface TeacherClass {
  id: number;
  name: string;
  studentCount: number;
  latestExamId?: number;
}

export interface UploadPreviewRow {
  rowNumber: number;
  studentNo: string;
  studentName: string;
  answers: Record<string, 0 | 1>;
  errors: Array<{
    rowNumber: number;
    field: string;
    message: string;
  }>;
}

export interface UploadPreview {
  uploadId: number;
  status: 'previewed';
  summary: {
    rowCount: number;
    validRowCount: number;
    errorRowCount: number;
    questionCount: number;
  };
  rows: UploadPreviewRow[];
  errors: Array<{
    rowNumber?: number;
    field: string;
    message: string;
  }>;
}

export interface ConfirmImportResult {
  uploadId: number;
  examId: number;
  status: 'confirmed';
  importedResponses: number;
  diagnosedStudents: number;
}

export interface StudentResult {
  examId: number;
  examName: string;
  score: number;
  total: number;
  correctRate: number;
  createdAt: string;
}

export interface MasteryPoint {
  knowledgePointId: number;
  code: string;
  name: string;
  masteryProbability: number;
  level: 'weak' | 'medium' | 'strong';
  evidenceCorrect: number;
  evidenceTotal: number;
}

export interface StudentDiagnosis {
  examId: number;
  student: {
    id: number;
    studentNo: string;
    name: string;
  };
  score: {
    correct: number;
    total: number;
    correctRate: number;
  };
  mastery: MasteryPoint[];
  weakPoints: Array<{
    knowledgePointId: number;
    name: string;
    masteryProbability: number;
  }>;
  recommendation: string;
  knowledgeGraph: {
    nodes: Array<{
      id: number;
      name: string;
      masteryProbability: number;
    }>;
    edges: Array<{
      from: number;
      to: number;
      type: string;
    }>;
  };
}

export interface ApiError {
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export interface StudentOption {
  id: number;
  externalId: string;
  name: string;
  gradeId: number;
  gradeName: string;
  className: string;
  status: 'active' | 'inactive';
}

export interface ExamOption {
  id: number;
  name: string;
  examDate: string;
  term?: string;
}

export interface SubjectScoreSummary {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  score: number;
  totalScore: number;
  classRank?: number;
  gradeRank?: number;
}

export interface StudentOverview {
  student: StudentOption;
  exam: ExamOption;
  subjects: SubjectScoreSummary[];
  totalScore: number;
  totalFullScore: number;
  classRank: number;
  gradeRank: number;
}

export interface ScoreTrendPoint {
  examId: number;
  examName: string;
  examDate: string;
  totalScore: number;
  totalFullScore: number;
  classRank: number;
  gradeRank: number;
}

export interface SubjectTrendPoint {
  examId: number;
  examName: string;
  examDate: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  score: number;
  totalScore: number;
}

export interface StudentTrends {
  scoreTrend: ScoreTrendPoint[];
  subjectTrends: SubjectTrendPoint[];
}

export interface SubjectQuestionScore {
  questionId: number;
  questionNo: number;
  title: string;
  questionType: string;
  maxScore: number;
  score: number;
  scoreRate: number;
}

export interface SubjectAnalysis {
  student: StudentOption;
  exam: ExamOption;
  subject: SubjectScoreSummary;
  questions: SubjectQuestionScore[];
  weakQuestions: SubjectQuestionScore[];
}

export interface KnowledgeMastery {
  knowledgePointId: number;
  knowledgePointCode: string;
  knowledgePointName: string;
  masteryRate: number;
  evidenceQuestionCount: number;
}

export interface SubjectKnowledgeAnalysis {
  student: StudentOption;
  exam: ExamOption;
  subject: SubjectScoreSummary;
  knowledges: KnowledgeMastery[];
  weakKnowledges: KnowledgeMastery[];
}

export interface KnowledgeTrendPoint {
  examId: number;
  examName: string;
  examDate: string;
  subjectId: number;
  knowledgePointId: number;
  knowledgePointName: string;
  masteryRate: number;
}

export interface KnowledgeTrendResponse {
  trends: KnowledgeTrendPoint[];
}
