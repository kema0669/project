import Database from 'better-sqlite3';
import type { ExamBatch, SubjectScoreSummary } from './types.js';

export interface StudentOption {
  id: number;
  externalId: string;
  name: string;
  gradeId: number;
  gradeName: string;
  className: string;
  status: string;
}

export interface StudentOverview {
  student: StudentOption;
  exam: ExamBatch;
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
  exam: ExamBatch;
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
  exam: ExamBatch;
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

function studentRow(db: Database.Database, studentId: number): StudentOption | undefined {
  return db
    .prepare(`
      SELECT s.id,
             s.external_id AS externalId,
             s.name,
             s.grade_id AS gradeId,
             g.name AS gradeName,
             s.class_name AS className,
             s.status
      FROM students s
      JOIN grades g ON g.id = s.grade_id
      WHERE s.id = ?
    `)
    .get(studentId) as StudentOption | undefined;
}

export function listStudents(db: Database.Database, includeInactive = false): StudentOption[] {
  return db
    .prepare(`
      SELECT s.id,
             s.external_id AS externalId,
             s.name,
             s.grade_id AS gradeId,
             g.name AS gradeName,
             s.class_name AS className,
             s.status
      FROM students s
      JOIN grades g ON g.id = s.grade_id
      ${includeInactive ? '' : "WHERE s.status = 'active'"}
      ORDER BY g.id, s.class_name, s.id
    `)
    .all() as StudentOption[];
}

export function listExams(db: Database.Database): ExamBatch[] {
  return db
    .prepare(`
      SELECT id, name, exam_date AS examDate, term
      FROM exam_batches
      ORDER BY date(exam_date), id
    `)
    .all() as ExamBatch[];
}

export function getLatestExamId(db: Database.Database): number | undefined {
  const row = db
    .prepare('SELECT id FROM exam_batches ORDER BY date(exam_date) DESC, id DESC LIMIT 1')
    .get() as { id: number } | undefined;
  return row?.id;
}

export function getStudentSubjects(db: Database.Database, studentId: number): SubjectScoreSummary[] {
  const student = studentRow(db, studentId);
  if (!student) return [];

  return db
    .prepare(`
      SELECT sub.id AS subjectId,
             sub.code AS subjectCode,
             sub.name AS subjectName,
             0 AS score,
             0 AS totalScore
      FROM grade_subjects gs
      JOIN subjects sub ON sub.id = gs.subject_id
      WHERE gs.grade_id = ?
      ORDER BY sub.display_order
    `)
    .all(student.gradeId) as SubjectScoreSummary[];
}

export function getSubjectScores(db: Database.Database, studentId: number, examId: number): SubjectScoreSummary[] {
  return db
    .prepare(`
      SELECT sub.id AS subjectId,
             sub.code AS subjectCode,
             sub.name AS subjectName,
             ss.score,
             p.total_score AS totalScore,
             ss.class_rank AS classRank,
             ss.grade_rank AS gradeRank
      FROM student_scores ss
      JOIN subjects sub ON sub.id = ss.subject_id
      JOIN papers p ON p.id = ss.paper_id
      WHERE ss.student_id = ? AND ss.exam_id = ?
      ORDER BY sub.display_order
    `)
    .all(studentId, examId) as SubjectScoreSummary[];
}

function totalRank(
  db: Database.Database,
  examId: number,
  studentId: number,
  scope: 'class' | 'grade'
): number {
  // 总分排名按同一次考试、同一年级计算；班级排名再额外限制 class_name。
  // 这里用“比当前学生总分高的人数 + 1”得到竞争排名，便于解释。
  const student = studentRow(db, studentId);
  if (!student) return 0;

  const totals = db
    .prepare(`
      SELECT s.id AS studentId,
             SUM(ss.score) AS totalScore
      FROM students s
      JOIN student_scores ss ON ss.student_id = s.id
      WHERE ss.exam_id = ?
        AND s.grade_id = ?
        ${scope === 'class' ? 'AND s.class_name = ?' : ''}
      GROUP BY s.id
    `)
    .all(...(scope === 'class' ? [examId, student.gradeId, student.className] : [examId, student.gradeId])) as {
    studentId: number;
    totalScore: number;
  }[];

  const current = totals.find((row) => row.studentId === studentId);
  if (!current) return 0;
  return totals.filter((row) => row.totalScore > current.totalScore).length + 1;
}

export function getStudentOverview(
  db: Database.Database,
  studentId: number,
  examId = getLatestExamId(db)
): StudentOverview | undefined {
  const student = studentRow(db, studentId);
  if (!student || !examId) return undefined;

  const exam = db
    .prepare('SELECT id, name, exam_date AS examDate, term FROM exam_batches WHERE id = ?')
    .get(examId) as ExamBatch | undefined;
  if (!exam) return undefined;

  const subjects = getSubjectScores(db, studentId, examId);
  if (subjects.length === 0) return undefined;

  const totalScore = Math.round(subjects.reduce((sum, subject) => sum + subject.score, 0) * 10) / 10;
  const totalFullScore = Math.round(subjects.reduce((sum, subject) => sum + subject.totalScore, 0) * 10) / 10;

  return {
    student,
    exam,
    subjects,
    totalScore,
    totalFullScore,
    classRank: totalRank(db, examId, studentId, 'class'),
    gradeRank: totalRank(db, examId, studentId, 'grade'),
  };
}

export function getStudentTrends(db: Database.Database, studentId: number): {
  scoreTrend: ScoreTrendPoint[];
  subjectTrends: SubjectTrendPoint[];
} {
  const exams = listExams(db);
  const scoreTrend = exams
    .map((exam) => {
      const overview = getStudentOverview(db, studentId, exam.id);
      if (!overview) return undefined;
      return {
        examId: exam.id,
        examName: exam.name,
        examDate: exam.examDate,
        totalScore: overview.totalScore,
        totalFullScore: overview.totalFullScore,
        classRank: overview.classRank,
        gradeRank: overview.gradeRank,
      };
    })
    .filter((point): point is ScoreTrendPoint => Boolean(point));

  const subjectTrends = db
    .prepare(`
      SELECT eb.id AS examId,
             eb.name AS examName,
             eb.exam_date AS examDate,
             sub.id AS subjectId,
             sub.code AS subjectCode,
             sub.name AS subjectName,
             ss.score,
             p.total_score AS totalScore
      FROM student_scores ss
      JOIN exam_batches eb ON eb.id = ss.exam_id
      JOIN subjects sub ON sub.id = ss.subject_id
      JOIN papers p ON p.id = ss.paper_id
      WHERE ss.student_id = ?
      ORDER BY date(eb.exam_date), sub.display_order
    `)
    .all(studentId) as SubjectTrendPoint[];

  return { scoreTrend, subjectTrends };
}

export function getSubjectAnalysis(
  db: Database.Database,
  studentId: number,
  examId: number,
  subjectId: number
): SubjectAnalysis | undefined {
  const overview = getStudentOverview(db, studentId, examId);
  if (!overview) return undefined;

  const subject = overview.subjects.find((item) => item.subjectId === subjectId);
  if (!subject) return undefined;

  const questions = db
    .prepare(`
      SELECT pq.id AS questionId,
             pq.question_no AS questionNo,
             pq.title,
             pq.question_type AS questionType,
             pq.max_score AS maxScore,
             qs.score,
             ROUND(qs.score / pq.max_score, 4) AS scoreRate
      FROM question_scores qs
      JOIN paper_questions pq ON pq.id = qs.paper_question_id
      JOIN papers p ON p.id = pq.paper_id
      WHERE qs.student_id = ?
        AND qs.exam_id = ?
        AND p.subject_id = ?
      ORDER BY pq.display_order, pq.question_no
    `)
    .all(studentId, examId, subjectId) as SubjectQuestionScore[];

  return {
    student: overview.student,
    exam: overview.exam,
    subject,
    questions,
    weakQuestions: questions.filter((question) => question.scoreRate < 0.7),
  };
}

function getKnowledgeMasteryRows(
  db: Database.Database,
  studentId: number,
  examId: number,
  subjectId: number
): KnowledgeMastery[] {
  // 考点掌握率采用可解释的聚合方式：
  // 每题得分率乘以题目-考点权重，再按考点加权平均。
  return db
    .prepare(`
      SELECT kp.id AS knowledgePointId,
             kp.code AS knowledgePointCode,
             kp.name AS knowledgePointName,
             ROUND(SUM((qs.score / pq.max_score) * qkm.weight) / SUM(qkm.weight), 4) AS masteryRate,
             COUNT(DISTINCT pq.id) AS evidenceQuestionCount
      FROM question_scores qs
      JOIN paper_questions pq ON pq.id = qs.paper_question_id
      JOIN papers p ON p.id = pq.paper_id
      JOIN question_knowledge_map qkm ON qkm.paper_question_id = pq.id
      JOIN knowledge_points kp ON kp.id = qkm.knowledge_point_id
      WHERE qs.student_id = ?
        AND qs.exam_id = ?
        AND p.subject_id = ?
      GROUP BY kp.id, kp.code, kp.name
      ORDER BY masteryRate ASC, kp.id
    `)
    .all(studentId, examId, subjectId) as KnowledgeMastery[];
}

export function getSubjectKnowledgeAnalysis(
  db: Database.Database,
  studentId: number,
  examId: number,
  subjectId: number
): SubjectKnowledgeAnalysis | undefined {
  const overview = getStudentOverview(db, studentId, examId);
  if (!overview) return undefined;

  const subject = overview.subjects.find((item) => item.subjectId === subjectId);
  if (!subject) return undefined;

  const knowledges = getKnowledgeMasteryRows(db, studentId, examId, subjectId);
  if (knowledges.length === 0) return undefined;

  return {
    student: overview.student,
    exam: overview.exam,
    subject,
    knowledges,
    weakKnowledges: knowledges.filter((knowledge) => knowledge.masteryRate < 0.7),
  };
}

export function getSubjectKnowledgeTrends(
  db: Database.Database,
  studentId: number,
  subjectId: number
): KnowledgeTrendPoint[] {
  return listExams(db).flatMap((exam) =>
    getKnowledgeMasteryRows(db, studentId, exam.id, subjectId).map((knowledge) => ({
      examId: exam.id,
      examName: exam.name,
      examDate: exam.examDate,
      subjectId,
      knowledgePointId: knowledge.knowledgePointId,
      knowledgePointName: knowledge.knowledgePointName,
      masteryRate: knowledge.masteryRate,
    }))
  );
}
