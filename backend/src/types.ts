export interface Grade {
  id: number;
  code: string;
  name: string;
  stage: string;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  displayOrder: number;
}

export interface Student {
  id: number;
  externalId: string;
  name: string;
  gradeId: number;
  gradeName?: string;
  className: string;
  status: 'active' | 'inactive';
}

export interface ExamBatch {
  id: number;
  name: string;
  examDate: string;
  term?: string;
}

export interface Paper {
  id: number;
  examId: number;
  gradeId: number;
  subjectId: number;
  name: string;
  totalScore: number;
}

export interface PaperQuestion {
  id: number;
  paperId: number;
  questionNo: number;
  title: string;
  questionType: string;
  maxScore: number;
}

export interface KnowledgePoint {
  id: number;
  subjectId: number;
  code: string;
  name: string;
  description?: string;
  level: number;
}

export interface StudentScore {
  id: number;
  examId: number;
  studentId: number;
  subjectId: number;
  paperId: number;
  score: number;
  classRank?: number;
  gradeRank?: number;
}

export interface QuestionScore {
  id: number;
  examId: number;
  studentId: number;
  paperQuestionId: number;
  score: number;
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

export interface QMatrixEntry {
  questionId: number;
  knowledgePointId: number;
  weight: 0 | 1;
}

export interface XMatrixEntry {
  studentId: number;
  questionId: number;
  isCorrect: 0 | 1;
}

export interface MasteryProbability {
  studentId: number;
  knowledgePointId: number;
  probability: number;
  evidenceCorrect: number;
  evidenceTotal: number;
}
