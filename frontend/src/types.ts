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

export interface ImportSummary {
  examId?: number;
  examName?: string;
  totalRows?: number;
  importedScores?: number;
  newStudents?: number;
  updatedStudents?: number;
  responseCount?: number;
  warnings?: string[];
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
