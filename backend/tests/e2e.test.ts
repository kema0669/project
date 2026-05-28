import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';

describe('E2E: multi-subject score overview API', () => {
  let app: Application;

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    const mod = await import('../src/server.js');
    app = mod.default;
  });

  it('GET /api/students should return active students with grade info', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(200);
    expect(res.body.students.length).toBeGreaterThanOrEqual(9);
    expect(res.body.students[0]).toHaveProperty('gradeName');
    expect(res.body.students[0]).toHaveProperty('className');
  });

  it('GET /api/exams should return seeded exams', async () => {
    const res = await request(app).get('/api/exams');
    expect(res.status).toBe(200);
    expect(res.body.exams).toHaveLength(3);
  });

  it('GET /api/students/:studentId/subjects should hide unstudied subjects', async () => {
    const res = await request(app).get('/api/students/1/subjects');
    expect(res.status).toBe(200);
    const codes = res.body.subjects.map((s: { subjectCode: string }) => s.subjectCode);
    expect(codes).toContain('chinese');
    expect(codes).toContain('biology');
    expect(codes).not.toContain('physics');
  });

  it('GET /api/students/:studentId/exams/:examId/overview should return score radar data', async () => {
    const res = await request(app).get('/api/students/4/exams/3/overview');
    expect(res.status).toBe(200);
    expect(res.body.student.gradeName).toBe('初二');
    expect(res.body.subjects.length).toBeGreaterThanOrEqual(8);
    expect(res.body.totalScore).toBeGreaterThan(0);
    expect(res.body.classRank).toBeGreaterThanOrEqual(1);
    expect(res.body.gradeRank).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/students/:studentId/trends should return score and rank trends', async () => {
    const res = await request(app).get('/api/students/7/trends');
    expect(res.status).toBe(200);
    expect(res.body.scoreTrend).toHaveLength(3);
    expect(res.body.subjectTrends.length).toBeGreaterThan(3);
    expect(res.body.scoreTrend[0]).toHaveProperty('classRank');
    expect(res.body.scoreTrend[0]).toHaveProperty('gradeRank');
  });

  it('GET /api/students/:studentId/exams/:examId/subjects/:subjectId should return question-level subject analysis', async () => {
    const res = await request(app).get('/api/students/4/exams/3/subjects/4');
    expect(res.status).toBe(200);
    expect(res.body.subject.subjectCode).toBe('physics');
    expect(res.body.questions).toHaveLength(5);
    expect(res.body.questions[0].score).toBeGreaterThanOrEqual(0);
    expect(res.body.questions[0].maxScore).toBeGreaterThan(0);
    expect(res.body.weakQuestions.every((q: { scoreRate: number }) => q.scoreRate < 0.7)).toBe(true);
  });

  it('GET /api/students/:studentId/exams/:examId/subjects/:subjectId/knowledge should return knowledge mastery', async () => {
    const res = await request(app).get('/api/students/4/exams/3/subjects/4/knowledge');
    expect(res.status).toBe(200);
    expect(res.body.subject.subjectCode).toBe('physics');
    expect(res.body.knowledges.length).toBeGreaterThanOrEqual(3);
    expect(res.body.knowledges[0].masteryRate).toBeGreaterThanOrEqual(0);
    expect(res.body.knowledges[0].masteryRate).toBeLessThanOrEqual(1);
  });

  it('GET /api/students/:studentId/subjects/:subjectId/knowledge-trends should return knowledge mastery trends', async () => {
    const res = await request(app).get('/api/students/4/subjects/4/knowledge-trends');
    expect(res.status).toBe(200);
    expect(res.body.trends.length).toBeGreaterThanOrEqual(9);
    expect(res.body.trends[0]).toHaveProperty('examName');
    expect(res.body.trends[0]).toHaveProperty('knowledgePointName');
  });

  it('POST /api/paper-drafts should create an AI-assisted review draft', async () => {
    const res = await request(app)
      .post('/api/paper-drafts')
      .send({
        examId: 3,
        gradeId: 2,
        subjectId: 4,
        sourceName: '八年级物理试卷.docx',
        questions: [{ questionNo: 1, title: '分析小车运动状态', maxScore: 10 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.draft.status).toBe('needs_review');
    expect(res.body.draft.questions[0].candidates.length).toBeGreaterThan(0);
  });

  it('POST /api/paper-drafts/:draftId/confirm should mark a draft as confirmed', async () => {
    const created = await request(app)
      .post('/api/paper-drafts')
      .send({
        examId: 3,
        gradeId: 2,
        subjectId: 4,
        sourceName: 'teacher-upload.xlsx',
        questions: [{ questionNo: 1, title: '声现象实验题', maxScore: 12 }],
      });

    const res = await request(app)
      .post(`/api/paper-drafts/${created.body.draft.id}/confirm`)
      .send({ reviewerNote: '老师确认后进入正式入库流程' });

    expect(res.status).toBe(200);
    expect(res.body.draft.status).toBe('confirmed');
    expect(res.body.draft.reviewerNote).toContain('老师确认');
  });
});
