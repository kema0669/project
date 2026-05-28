import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import type Database from 'better-sqlite3';
import cors from 'cors';
import express from 'express';
import * as XLSX from 'xlsx';
import { initDatabase } from './db.js';
import {
  getLatestExamId,
  getStudentOverview,
  getStudentSubjects,
  getStudentTrends,
  getSubjectKnowledgeAnalysis,
  getSubjectKnowledgeTrends,
  getSubjectAnalysis,
  listExams,
  listStudents,
} from './diagnosis.js';
import { confirmPaperDraft, createPaperDraft, getPaperDraft } from './paperDrafts.js';
import { seedData } from './seed.js';
import { estimateDINA } from './algorithm/dina.js';
import type { QMatrixEntry, XMatrixEntry } from './types.js';

const require = createRequire(import.meta.url);
const formidableLib = require('formidable') as {
  formidable?: (options?: Record<string, unknown>) => {
    parse: (
      req: express.Request,
      callback: (err: Error | null, fields: Record<string, string[]>, files: Record<string, unknown>) => void
    ) => void;
  };
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const DB_PATH = process.env.DB_PATH || 'data/cdi.db';
export const db: Database.Database = initDatabase(DB_PATH);

const subjectCount = (db.prepare('SELECT COUNT(*) AS cnt FROM subjects').get() as { cnt: number }).cnt;
const userCount = (db.prepare('SELECT COUNT(*) AS cnt FROM users').get() as { cnt: number }).cnt;
if (subjectCount === 0 || userCount === 0) {
  seedData(db);
}

type AuthUser = {
  id: number;
  username: string;
  role: 'teacher' | 'student';
  displayName: string;
  studentId?: number;
};

type AuthedRequest = express.Request & { user?: AuthUser };

function ok(res: express.Response, data: unknown): void {
  res.json({ data });
}

function fail(res: express.Response, status: number, code: string, message: string, details: unknown[] = []): void {
  res.status(status).json({ error: { code, message, details } });
}

function issueToken(user: AuthUser): string {
  return Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
}

function parseToken(token: string): AuthUser | undefined {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as AuthUser;
    if (!decoded.id || !decoded.role) return undefined;
    return decoded;
  } catch {
    return undefined;
  }
}

function auth(requiredRole?: 'teacher' | 'student') {
  return (req: AuthedRequest, res: express.Response, next: express.NextFunction) => {
    const header = req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    const user = parseToken(token);
    if (!user) {
      fail(res, 401, 'UNAUTHORIZED', 'Missing or invalid token.');
      return;
    }
    if (requiredRole && user.role !== requiredRole) {
      fail(res, 403, 'FORBIDDEN', 'Role is not allowed to access this resource.');
      return;
    }
    req.user = user;
    next();
  };
}

function getStudentIdForUser(userId: number): number | undefined {
  const row = db.prepare('SELECT id FROM students WHERE user_id = ?').get(userId) as { id: number } | undefined;
  return row?.id;
}

function teacherOwnsClass(teacherUserId: number, classId: number): boolean {
  const row = db.prepare('SELECT id FROM classes WHERE id = ? AND teacher_user_id = ?').get(classId, teacherUserId);
  return Boolean(row);
}

function requiredExcelHeaders(): string[] {
  return [
    'student_no',
    'student_name',
    'class_name',
    'exam_name',
    ...Array.from({ length: 20 }, (_, index) => `q${index + 1}`),
  ];
}

function firstValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
}

function parseMultipart(req: express.Request): Promise<{
  fields: Record<string, string[]>;
  files: Record<string, { filepath: string; originalFilename?: string }[]>;
}> {
  const formidable = formidableLib.formidable;
  if (!formidable) throw new Error('formidable is not available');
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        fields,
        files: files as Record<string, { filepath: string; originalFilename?: string }[]>,
      });
    });
  });
}

function getUploadFile(files: Record<string, { filepath: string; originalFilename?: string }[]>): {
  filepath: string;
  originalFilename: string;
} | undefined {
  const file = Array.isArray(files.file) ? files.file[0] : undefined;
  if (!file?.filepath) return undefined;
  return { filepath: file.filepath, originalFilename: file.originalFilename ?? 'upload.xlsx' };
}

function ensureMvpExam(classId: number, examName: string, teacherUserId: number): number {
  const existing = db.prepare('SELECT id FROM exams WHERE class_id = ? AND name = ?').get(classId, examName) as
    | { id: number }
    | undefined;
  if (existing) return existing.id;

  const result = db
    .prepare('INSERT INTO exams (class_id, name, question_count, created_by_user_id) VALUES (?, ?, 20, ?)')
    .run(classId, examName, teacherUserId);
  const examId = Number(result.lastInsertRowid);
  const insertQuestion = db.prepare(
    'INSERT INTO questions (exam_id, question_no, content, difficulty) VALUES (?, ?, ?, ?)'
  );
  const insertQMatrix = db.prepare(
    'INSERT OR IGNORE INTO q_matrix (question_id, knowledge_point_id, weight) VALUES (?, ?, 1)'
  );
  for (let i = 1; i <= 20; i++) {
    const qResult = insertQuestion.run(examId, i, `Question ${i}`, 0.5);
    const questionId = Number(qResult.lastInsertRowid);
    insertQMatrix.run(questionId, ((i - 1) % 5) + 1);
    if (i % 4 === 0) insertQMatrix.run(questionId, 5);
  }
  return examId;
}

function ensureMvpQuestions(examId: number): void {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM questions WHERE exam_id = ?').get(examId) as { cnt: number };
  if (count.cnt >= 20) return;
  const teacherId = (db.prepare('SELECT created_by_user_id AS id FROM exams WHERE id = ?').get(examId) as { id: number }).id;
  const exam = db.prepare('SELECT class_id AS classId, name FROM exams WHERE id = ?').get(examId) as {
    classId: number;
    name: string;
  };
  db.prepare('DELETE FROM exams WHERE id = ?').run(examId);
  ensureMvpExam(exam.classId, exam.name, teacherId);
}

function buildRecommendation(results: { name: string; masteryProbability: number }[]): string {
  const weak = results.filter((row) => row.masteryProbability < 0.6).map((row) => row.name);
  if (weak.length > 0) return `Prioritize ${weak.join(', ')} and review related practice questions first.`;
  return 'Current mastery is stable. Keep consolidating with mixed practice questions.';
}

function runDiagnosisForStudents(examId: number, studentIds: number[]): void {
  ensureMvpQuestions(examId);
  const qMatrix = db
    .prepare(
      'SELECT question_id AS questionId, knowledge_point_id AS knowledgePointId, weight FROM q_matrix WHERE question_id IN (SELECT id FROM questions WHERE exam_id = ?) ORDER BY question_id, knowledge_point_id'
    )
    .all(examId) as QMatrixEntry[];
  const insertDiagnosis = db.prepare(`
    INSERT INTO diagnosis_results (
      exam_id, student_id, knowledge_point_id, mastery_probability, evidence_correct, evidence_total, model_version
    )
    VALUES (?, ?, ?, ?, ?, ?, 'dina-basic-v1')
    ON CONFLICT(exam_id, student_id, knowledge_point_id, model_version) DO UPDATE SET
      mastery_probability = excluded.mastery_probability,
      evidence_correct = excluded.evidence_correct,
      evidence_total = excluded.evidence_total,
      created_at = CURRENT_TIMESTAMP
  `);
  const deleteRecommendation = db.prepare('DELETE FROM recommendations WHERE exam_id = ? AND student_id = ?');
  const insertRecommendation = db.prepare(
    "INSERT INTO recommendations (exam_id, student_id, content, source) VALUES (?, ?, ?, 'rule')"
  );
  const knowledgeRows = db
    .prepare("SELECT id, name FROM knowledge_points WHERE code LIKE 'kp_%' ORDER BY sort_order, id")
    .all() as { id: number; name: string }[];

  for (const studentId of studentIds) {
    const xMatrix = db
      .prepare(
        'SELECT student_id AS studentId, question_id AS questionId, is_correct AS isCorrect FROM responses WHERE exam_id = ? AND student_id = ? ORDER BY question_id'
      )
      .all(examId, studentId) as XMatrixEntry[];
    const results = estimateDINA(qMatrix, xMatrix);
    for (const result of results) {
      insertDiagnosis.run(
        examId,
        result.studentId,
        result.knowledgePointId,
        result.probability,
        result.evidenceCorrect,
        result.evidenceTotal
      );
    }
    const namedResults = results.map((result) => ({
      name: knowledgeRows.find((row) => row.id === result.knowledgePointId)?.name ?? `Knowledge ${result.knowledgePointId}`,
      masteryProbability: result.probability,
    }));
    deleteRecommendation.run(examId, studentId);
    insertRecommendation.run(examId, studentId, buildRecommendation(namedResults));
  }
}

function masteryLevel(probability: number): 'weak' | 'medium' | 'strong' {
  if (probability < 0.6) return 'weak';
  if (probability < 0.8) return 'medium';
  return 'strong';
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body ?? {};
  const row = db
    .prepare('SELECT id, username, password_hash AS passwordHash, role, display_name AS displayName FROM users WHERE username = ?')
    .get(username) as
    | { id: number; username: string; passwordHash: string; role: 'teacher' | 'student'; displayName: string }
    | undefined;
  if (!row || row.passwordHash !== password) {
    fail(res, 401, 'UNAUTHORIZED', 'Invalid username or password.');
    return;
  }
  const user: AuthUser = {
    id: row.id,
    username: row.username,
    role: row.role,
    displayName: row.displayName,
    studentId: row.role === 'student' ? getStudentIdForUser(row.id) : undefined,
  };
  ok(res, {
    token: issueToken(user),
    user,
  });
});

app.get('/api/teacher/classes', auth('teacher'), (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT c.id,
              c.name,
              COUNT(s.id) AS studentCount,
              MAX(e.id) AS latestExamId
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id
       LEFT JOIN exams e ON e.class_id = c.id
       WHERE c.teacher_user_id = ?
       GROUP BY c.id, c.name
       ORDER BY c.id`
    )
    .all(req.user!.id);
  ok(res, rows);
});

app.post('/api/teacher/uploads/preview', auth('teacher'), async (req: AuthedRequest, res) => {
  try {
    const { fields, files } = await parseMultipart(req);
    const classId = Number(firstValue(fields.classId));
    const examName = firstValue(fields.examName);
    const file = getUploadFile(files);
    if (!classId || !examName || !file) {
      fail(res, 400, 'VALIDATION_ERROR', 'classId, examName and file are required.');
      return;
    }
    if (!teacherOwnsClass(req.user!.id, classId)) {
      fail(res, 403, 'FORBIDDEN', 'Teacher does not own this class.');
      return;
    }

    const fileBuffer = await fs.readFile(file.filepath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const headers = new Set(Object.keys(rawRows[0] ?? {}));
    const details: { rowNumber?: number; field: string; message: string }[] = [];
    for (const header of requiredExcelHeaders()) {
      if (!headers.has(header)) details.push({ field: header, message: 'Required column is missing.' });
    }

    const classRow = db.prepare('SELECT name FROM classes WHERE id = ?').get(classId) as { name: string } | undefined;
    const rows = rawRows.map((row, index) => {
      const errors: { rowNumber: number; field: string; message: string }[] = [];
      const rowNumber = index + 2;
      const studentNo = String(row.student_no ?? '').trim();
      const studentName = String(row.student_name ?? '').trim();
      const student = db
        .prepare('SELECT id, name FROM students WHERE student_no = ? AND class_id = ?')
        .get(studentNo, classId) as { id: number; name: string } | undefined;
      if (!student) errors.push({ rowNumber, field: 'student_no', message: 'Student does not exist in this class.' });
      if (!studentName) errors.push({ rowNumber, field: 'student_name', message: 'Student name is required.' });
      if (String(row.class_name ?? '').trim() !== classRow?.name) {
        errors.push({ rowNumber, field: 'class_name', message: 'Class name does not match selected class.' });
      }
      if (String(row.exam_name ?? '').trim() !== examName) {
        errors.push({ rowNumber, field: 'exam_name', message: 'Exam name does not match request.' });
      }

      const answers: Record<string, 0 | 1> = {};
      for (let i = 1; i <= 20; i++) {
        const field = `q${i}`;
        const value = Number(row[field]);
        if (!Number.isInteger(value) || ![0, 1].includes(value)) {
          errors.push({ rowNumber, field, message: 'Answer must be 0 or 1.' });
        } else {
          answers[field] = value as 0 | 1;
        }
      }
      details.push(...errors);
      return { rowNumber, studentNo, studentName, studentId: student?.id, answers, errors };
    });

    const payload = {
      status: 'previewed',
      summary: {
        rowCount: rows.length,
        validRowCount: rows.filter((row) => row.errors.length === 0).length,
        errorRowCount: rows.filter((row) => row.errors.length > 0).length + details.filter((detail) => !detail.rowNumber).length,
        questionCount: 20,
      },
      rows,
      errors: details,
    };
    const upload = db
      .prepare(
        `INSERT INTO uploads (
          teacher_user_id, class_id, original_filename, status, row_count, error_count, preview_payload_json
        ) VALUES (?, ?, ?, 'previewed', ?, ?, ?)`
      )
      .run(req.user!.id, classId, file.originalFilename, rows.length, details.length, JSON.stringify({ examName, ...payload }));
    await fs.rm(file.filepath, { force: true });
    const responsePayload = { uploadId: Number(upload.lastInsertRowid), ...payload };
    if (details.length > 0) {
      fail(res, 400, 'VALIDATION_ERROR', 'Excel validation failed.', details);
      return;
    }
    ok(res, responsePayload);
  } catch (error) {
    fail(res, 400, 'VALIDATION_ERROR', error instanceof Error ? error.message : 'Failed to parse upload.');
  }
});

app.post('/api/teacher/uploads/:uploadId/confirm', auth('teacher'), (req: AuthedRequest, res) => {
  const uploadId = Number(req.params.uploadId);
  const upload = db.prepare('SELECT * FROM uploads WHERE id = ? AND teacher_user_id = ?').get(uploadId, req.user!.id) as
    | { id: number; class_id: number; error_count: number; preview_payload_json: string }
    | undefined;
  if (!upload) {
    fail(res, 404, 'NOT_FOUND', 'Upload not found.');
    return;
  }
  if (upload.error_count > 0) {
    fail(res, 400, 'VALIDATION_ERROR', 'Upload has validation errors.');
    return;
  }

  const payload = JSON.parse(upload.preview_payload_json) as {
    examName: string;
    rows: { studentId: number; answers: Record<string, 0 | 1> }[];
  };
  const examId = ensureMvpExam(upload.class_id, payload.examName, req.user!.id);
  ensureMvpQuestions(examId);
  const questions = db
    .prepare('SELECT id, question_no AS questionNo FROM questions WHERE exam_id = ? ORDER BY question_no')
    .all(examId) as { id: number; questionNo: number }[];

  const trx = db.transaction(() => {
    const insertResponse = db.prepare(`
      INSERT INTO responses (exam_id, student_id, question_id, is_correct, upload_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(exam_id, student_id, question_id) DO UPDATE SET
        is_correct = excluded.is_correct,
        upload_id = excluded.upload_id,
        created_at = CURRENT_TIMESTAMP
    `);
    for (const row of payload.rows) {
      for (const question of questions) {
        insertResponse.run(examId, row.studentId, question.id, row.answers[`q${question.questionNo}`], uploadId);
      }
    }
    db.prepare("UPDATE uploads SET status = 'confirmed', exam_id = ?, confirmed_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      examId,
      uploadId
    );
    runDiagnosisForStudents(
      examId,
      payload.rows.map((row) => row.studentId)
    );
  });
  trx();

  ok(res, {
    uploadId,
    examId,
    status: 'confirmed',
    importedResponses: payload.rows.length * 20,
    diagnosedStudents: payload.rows.length,
  });
});

app.get('/api/student/me/results', auth('student'), (req: AuthedRequest, res) => {
  const studentId = req.user!.studentId;
  if (!studentId) {
    fail(res, 404, 'NOT_FOUND', 'Student profile not found.');
    return;
  }
  const rows = db
    .prepare(
      `SELECT e.id AS examId,
              e.name AS examName,
              SUM(r.is_correct) AS score,
              COUNT(r.id) AS total,
              ROUND(CAST(SUM(r.is_correct) AS REAL) / COUNT(r.id), 4) AS correctRate,
              MAX(r.created_at) AS createdAt
       FROM responses r
       JOIN exams e ON e.id = r.exam_id
       WHERE r.student_id = ?
       GROUP BY e.id, e.name
       ORDER BY e.id DESC`
    )
    .all(studentId);
  ok(res, rows);
});

app.get('/api/student/me/diagnosis', auth('student'), (req: AuthedRequest, res) => {
  const studentId = req.user!.studentId;
  const examId = Number(req.query.examId);
  if (!studentId || !examId) {
    fail(res, 400, 'VALIDATION_ERROR', 'examId is required.');
    return;
  }
  const student = db.prepare('SELECT id, student_no AS studentNo, name FROM students WHERE id = ?').get(studentId);
  const score = db
    .prepare(
      'SELECT SUM(is_correct) AS correct, COUNT(*) AS total, ROUND(CAST(SUM(is_correct) AS REAL) / COUNT(*), 4) AS correctRate FROM responses WHERE exam_id = ? AND student_id = ?'
    )
    .get(examId, studentId) as { correct: number | null; total: number; correctRate: number | null };
  const mastery = db
    .prepare(
      `SELECT kp.id AS knowledgePointId,
              kp.code,
              kp.name,
              dr.mastery_probability AS masteryProbability,
              dr.evidence_correct AS evidenceCorrect,
              dr.evidence_total AS evidenceTotal
       FROM diagnosis_results dr
       JOIN knowledge_points kp ON kp.id = dr.knowledge_point_id
       WHERE dr.exam_id = ? AND dr.student_id = ?
       ORDER BY kp.sort_order, kp.id`
    )
    .all(examId, studentId) as {
    knowledgePointId: number;
    code: string;
    name: string;
    masteryProbability: number;
    evidenceCorrect: number;
    evidenceTotal: number;
  }[];
  const recommendation = db
    .prepare('SELECT content FROM recommendations WHERE exam_id = ? AND student_id = ? ORDER BY id DESC LIMIT 1')
    .get(examId, studentId) as { content: string } | undefined;
  const edges = db
    .prepare('SELECT from_knowledge_point_id AS "from", to_knowledge_point_id AS "to", relation_type AS type FROM knowledge_relations')
    .all();

  ok(res, {
    examId,
    student,
    score: {
      correct: score.correct ?? 0,
      total: score.total,
      correctRate: score.correctRate ?? 0,
    },
    mastery: mastery.map((row) => ({ ...row, level: masteryLevel(row.masteryProbability) })),
    weakPoints: mastery
      .filter((row) => row.masteryProbability < 0.6)
      .map((row) => ({
        knowledgePointId: row.knowledgePointId,
        name: row.name,
        masteryProbability: row.masteryProbability,
      })),
    recommendation: recommendation?.content ?? '',
    knowledgeGraph: {
      nodes: mastery.map((row) => ({
        id: row.knowledgePointId,
        name: row.name,
        masteryProbability: row.masteryProbability,
      })),
      edges,
    },
  });
});

app.get('/api/students', (req, res) => {
  res.json({ students: listStudents(db, req.query.includeInactive === 'true') });
});

app.get('/api/exams', (_req, res) => {
  res.json({ exams: listExams(db) });
});

app.get('/api/students/:studentId/subjects', (req, res) => {
  const studentId = Number(req.params.studentId);
  const subjects = getStudentSubjects(db, studentId);
  if (subjects.length === 0) {
    res.status(404).json({ error: 'Student not found or has no configured subjects' });
    return;
  }
  res.json({ subjects });
});

app.get('/api/students/:studentId/exams/:examId/overview', (req, res) => {
  const studentId = Number(req.params.studentId);
  const examId = Number(req.params.examId || getLatestExamId(db));
  const overview = getStudentOverview(db, studentId, examId);
  if (!overview) {
    res.status(404).json({ error: 'Overview not found' });
    return;
  }
  res.json(overview);
});

app.get('/api/students/:studentId/trends', (req, res) => {
  const studentId = Number(req.params.studentId);
  const trends = getStudentTrends(db, studentId);
  if (trends.scoreTrend.length === 0) {
    res.status(404).json({ error: 'Trend not found' });
    return;
  }
  res.json(trends);
});

app.get('/api/students/:studentId/exams/:examId/subjects/:subjectId', (req, res) => {
  const analysis = getSubjectAnalysis(
    db,
    Number(req.params.studentId),
    Number(req.params.examId),
    Number(req.params.subjectId)
  );
  if (!analysis) {
    res.status(404).json({ error: 'Subject analysis not found' });
    return;
  }
  res.json(analysis);
});

app.get('/api/students/:studentId/exams/:examId/subjects/:subjectId/knowledge', (req, res) => {
  const analysis = getSubjectKnowledgeAnalysis(
    db,
    Number(req.params.studentId),
    Number(req.params.examId),
    Number(req.params.subjectId)
  );
  if (!analysis) {
    res.status(404).json({ error: 'Subject knowledge analysis not found' });
    return;
  }
  res.json(analysis);
});

app.get('/api/students/:studentId/subjects/:subjectId/knowledge-trends', (req, res) => {
  const trends = getSubjectKnowledgeTrends(db, Number(req.params.studentId), Number(req.params.subjectId));
  if (trends.length === 0) {
    res.status(404).json({ error: 'Subject knowledge trends not found' });
    return;
  }
  res.json({ trends });
});

app.post('/api/paper-drafts', (req, res) => {
  try {
    const draft = createPaperDraft(db, req.body);
    res.json({ draft });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create paper draft' });
  }
});

app.get('/api/paper-drafts/:draftId', (req, res) => {
  const draft = getPaperDraft(db, Number(req.params.draftId));
  if (!draft) {
    res.status(404).json({ error: 'Draft not found' });
    return;
  }
  res.json({ draft });
});

app.post('/api/paper-drafts/:draftId/confirm', (req, res) => {
  try {
    const draft = confirmPaperDraft(db, Number(req.params.draftId), req.body?.reviewerNote ?? '');
    res.json({ draft });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Draft not found' });
  }
});

export default app;

export function startServer(port = 3000) {
  app.listen(port, () => {
    console.log(`Score Analysis API running on http://localhost:${port}`);
  });
}

const __filename = fileURLToPath(import.meta.url);
if (path.normalize(__filename) === path.normalize(process.argv[1] || '')) {
  startServer(Number(process.env.PORT) || 3000);
}
