import { beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import type Database from 'better-sqlite3';
import * as XLSX from 'xlsx';

const headers = [
  'student_no',
  'student_name',
  'class_name',
  'exam_name',
  ...Array.from({ length: 20 }, (_, index) => `q${index + 1}`),
];

async function loadApp(): Promise<{ app: Application; db: Database.Database }> {
  vi.resetModules();
  process.env.DB_PATH = ':memory:';
  const mod = await import('../src/server.js');
  return { app: mod.default, db: mod.db };
}

async function login(app: Application, username: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ username, password: 'password123' });
  expect(res.status).toBe(200);
  return res.body.data.token;
}

async function register(app: Application, username: string, studentNo: string) {
  const res = await request(app).post('/api/auth/register-student').send({
    username,
    password: 'password123',
    student_no: studentNo,
  });
  expect(res.status).toBe(200);
  return res.body.data as { user: { id: number }; binding: { studentId: number; status: string } };
}

function workbookBuffer(studentNo: string): Buffer {
  const row = {
    student_no: studentNo,
    student_name: 'E2E Student',
    class_name: 'Class A',
    exam_name: 'DINA Diagnostic Quiz',
    ...Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`q${index + 1}`, index % 3 === 0 ? 0 : 1])),
  };
  const worksheet = XLSX.utils.json_to_sheet([row], { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'scores');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

async function uploadDiagnosisForStudent(app: Application, teacherToken: string, studentNo: string): Promise<number> {
  const preview = await request(app)
    .post('/api/teacher/uploads/preview')
    .set('Authorization', `Bearer ${teacherToken}`)
    .field('classId', '1')
    .field('examName', 'DINA Diagnostic Quiz')
    .attach('file', workbookBuffer(studentNo), 'scores.xlsx');
  expect(preview.status).toBe(200);

  const confirm = await request(app)
    .post(`/api/teacher/uploads/${preview.body.data.uploadId}/confirm`)
    .set('Authorization', `Bearer ${teacherToken}`)
    .send({ runDiagnosis: true });
  expect(confirm.status).toBe(200);
  return confirm.body.data.examId;
}

describe('E2E: student registration and teacher approval flow', () => {
  let app: Application;
  let db: Database.Database;

  beforeAll(async () => {
    const context = await loadApp();
    app = context.app;
    db = context.db;
    db.prepare("UPDATE students SET user_id = NULL WHERE student_no IN ('S001', 'S002', 'S003')").run();
  });

  it('completes registration, pending block, teacher approval, and approved student diagnosis access', async () => {
    const teacherToken = await login(app, 'teacher01');
    const examId = await uploadDiagnosisForStudent(app, teacherToken, 'S001');
    const registration = await register(app, 'e2e_pending_s001', 'S001');
    expect(registration.binding).toMatchObject({ status: 'pending' });

    const pendingToken = await login(app, 'e2e_pending_s001');
    const pendingStatus = await request(app)
      .get('/api/student/me/status')
      .set('Authorization', `Bearer ${pendingToken}`);
    expect(pendingStatus.status).toBe(200);
    expect(pendingStatus.body.data).toMatchObject({
      status: 'pending',
      canViewResults: false,
    });

    const blockedResults = await request(app)
      .get('/api/student/me/results')
      .set('Authorization', `Bearer ${pendingToken}`);
    const blockedDiagnosis = await request(app)
      .get('/api/student/me/diagnosis?examId=1')
      .set('Authorization', `Bearer ${pendingToken}`);
    expect(blockedResults.status).toBe(403);
    expect(blockedDiagnosis.status).toBe(403);

    const approvals = await request(app)
      .get('/api/teacher/student-approvals')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(approvals.status).toBe(200);
    expect(approvals.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          username: 'e2e_pending_s001',
          studentNo: 'S001',
          status: 'pending',
        }),
      ])
    );

    const approve = await request(app)
      .post(`/api/teacher/student-approvals/${registration.binding.studentId}/approve`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({});
    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe('approved');

    const approvedToken = await login(app, 'e2e_pending_s001');
    const results = await request(app)
      .get('/api/student/me/results')
      .set('Authorization', `Bearer ${approvedToken}`);
    expect(results.status).toBe(200);
    expect(results.body.data.length).toBeGreaterThan(0);

    const diagnosis = await request(app)
      .get(`/api/student/me/diagnosis?examId=${examId}`)
      .set('Authorization', `Bearer ${approvedToken}`);
    expect(diagnosis.status).toBe(200);
    expect(diagnosis.body.data.student.studentNo).toBe('S001');
    expect(diagnosis.body.data.mastery.length).toBeGreaterThan(0);
  });

  it('keeps a rejected student blocked from scores and diagnosis', async () => {
    const registration = await register(app, 'e2e_rejected_s002', 'S002');
    const teacherToken = await login(app, 'teacher01');

    const reject = await request(app)
      .post(`/api/teacher/student-approvals/${registration.binding.studentId}/reject`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ reason: '学号信息需重新确认' });
    expect(reject.status).toBe(200);
    expect(reject.body.data.status).toBe('rejected');

    const rejectedToken = await login(app, 'e2e_rejected_s002');
    const status = await request(app)
      .get('/api/student/me/status')
      .set('Authorization', `Bearer ${rejectedToken}`);
    expect(status.status).toBe(200);
    expect(status.body.data).toMatchObject({
      status: 'rejected',
      canViewResults: false,
    });

    const results = await request(app)
      .get('/api/student/me/results')
      .set('Authorization', `Bearer ${rejectedToken}`);
    expect(results.status).toBe(403);
  });

  it('prevents a student from reading another student through arbitrary student routes', async () => {
    const registration = await register(app, 'e2e_own_only_s003', 'S003');
    const teacherToken = await login(app, 'teacher01');
    await request(app)
      .post(`/api/teacher/student-approvals/${registration.binding.studentId}/approve`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({});

    const studentToken = await login(app, 'e2e_own_only_s003');
    const ownStatus = await request(app)
      .get('/api/student/me/status')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(ownStatus.body.data.student.studentNo).toBe('S003');

    const otherOverview = await request(app)
      .get('/api/students/1/exams/1/overview')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(otherOverview.status).toBe(403);
  });
});
