import { fileURLToPath } from 'node:url';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
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

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const DB_PATH = process.env.DB_PATH || 'data/cdi.db';
export const db = initDatabase(DB_PATH);

const subjectCount = (db.prepare('SELECT COUNT(*) AS cnt FROM subjects').get() as { cnt: number }).cnt;
if (subjectCount === 0) {
  seedData(db);
}

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
