import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import type Database from 'better-sqlite3';

type TestContext = {
  app: Application;
  db: Database.Database;
};

async function createTestContext(): Promise<TestContext> {
  vi.resetModules();
  process.env.DB_PATH = ':memory:';
  const mod = await import('../src/server.js');
  return { app: mod.default, db: mod.db };
}

function unbindStudent(db: Database.Database, studentNo: string): void {
  db.prepare('UPDATE students SET user_id = NULL WHERE student_no = ?').run(studentNo);
}

async function login(app: Application, username: string, password = 'password123'): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  expect(res.status).toBe(200);
  return res.body.data.token;
}

async function registerStudent(app: Application, studentNo: string, username = `register_${studentNo.toLowerCase()}`) {
  return request(app).post('/api/auth/register/student').send({
    username,
    password: 'password123',
    studentNo,
  });
}

async function expectPendingRegistration(app: Application, studentNo: string, username: string): Promise<number> {
  const res = await registerStudent(app, studentNo, username);
  expect(res.status).toBe(200);
  expect(res.body.data.user).toMatchObject({ username, role: 'student', status: 'pending' });
  return res.body.data.user.id;
}

describe('TDD: student self-registration, student_no binding, and teacher review', () => {
  let app: Application;
  let db: Database.Database;

  beforeEach(async () => {
    const context = await createTestContext();
    app = context.app;
    db = context.db;
    unbindStudent(db, 'S001');
    unbindStudent(db, 'S002');
    unbindStudent(db, 'S003');
  });

  it('allows a student to register with username, password, and student_no', async () => {
    const res = await registerStudent(app, 'S001', 'alice_s001');

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      username: 'alice_s001',
      role: 'student',
      status: 'pending',
    });
    expect(res.body.data.binding).toMatchObject({
      studentNo: 'S001',
      status: 'pending',
    });
  });

  it('creates a pending student account when student_no exists and is not bound', async () => {
    const res = await registerStudent(app, 'S001', 'pending_s001');

    expect(res.status).toBe(200);
    const userRow = db
      .prepare('SELECT id, username, role, status FROM users WHERE username = ?')
      .get('pending_s001') as { id: number; username: string; role: string; status: string };
    const studentRow = db
      .prepare('SELECT student_no AS studentNo, user_id AS userId FROM students WHERE student_no = ?')
      .get('S001') as { studentNo: string; userId: number };

    expect(userRow).toMatchObject({ username: 'pending_s001', role: 'student', status: 'pending' });
    expect(studentRow).toMatchObject({ studentNo: 'S001', userId: userRow.id });
  });

  it('rejects registration when student_no does not exist', async () => {
    const res = await registerStudent(app, 'NO-SUCH-STUDENT', 'missing_student');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '未找到该学号，请确认老师已上传成绩。',
    });
  });

  it('rejects registration when student_no is already bound to an account', async () => {
    const res = await registerStudent(app, 'S004', 'duplicate_s004');

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'CONFLICT',
      message: '该学号已绑定账号。',
    });
  });

  it('prevents a pending student from viewing scores and diagnosis', async () => {
    await expectPendingRegistration(app, 'S001', 'pending_blocked');
    const token = await login(app, 'pending_blocked');

    const results = await request(app).get('/api/student/me/results').set('Authorization', `Bearer ${token}`);
    const diagnosis = await request(app).get('/api/student/me/diagnosis?examId=1').set('Authorization', `Bearer ${token}`);

    expect(results.status).toBe(403);
    expect(results.body.error.code).toBe('FORBIDDEN');
    expect(diagnosis.status).toBe(403);
    expect(diagnosis.body.error.code).toBe('FORBIDDEN');
  });

  it('allows a teacher to list pending student binding applications', async () => {
    await expectPendingRegistration(app, 'S001', 'review_s001');
    const teacherToken = await login(app, 'teacher01');

    const res = await request(app)
      .get('/api/teacher/student-registrations?status=pending')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          username: 'review_s001',
          status: 'pending',
          studentNo: 'S001',
        }),
      ])
    );
  });

  it('allows a teacher to approve a student binding application', async () => {
    const userId = await expectPendingRegistration(app, 'S001', 'approve_s001');
    const teacherToken = await login(app, 'teacher01');

    const res = await request(app)
      .post(`/api/teacher/student-registrations/${userId}/approve`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      userId,
      status: 'approved',
    });
  });

  it('allows a teacher to reject a student binding application', async () => {
    const userId = await expectPendingRegistration(app, 'S002', 'reject_s002');
    const teacherToken = await login(app, 'teacher01');

    const res = await request(app)
      .post(`/api/teacher/student-registrations/${userId}/reject`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ reason: '学号信息需重新确认' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      userId,
      status: 'rejected',
    });
  });

  it('allows an approved student to view only their bound student_no results and diagnosis', async () => {
    const userId = await expectPendingRegistration(app, 'S001', 'approved_s001');
    const teacherToken = await login(app, 'teacher01');
    await request(app)
      .post(`/api/teacher/student-registrations/${userId}/approve`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({});

    const studentToken = await login(app, 'approved_s001');
    const results = await request(app).get('/api/student/me/results').set('Authorization', `Bearer ${studentToken}`);
    const diagnosis = await request(app).get('/api/student/me/diagnosis?examId=1').set('Authorization', `Bearer ${studentToken}`);

    expect(results.status).toBe(200);
    expect(results.body.data.length).toBeGreaterThan(0);
    expect(results.body.data.every((row: { otherStudentId?: number }) => row.otherStudentId === undefined)).toBe(true);
    expect(diagnosis.status).toBe(200);
    expect(diagnosis.body.data.student.studentNo).toBe('S001');
  });

  it('prevents a rejected student from viewing scores and diagnosis', async () => {
    const userId = await expectPendingRegistration(app, 'S002', 'rejected_s002');
    const teacherToken = await login(app, 'teacher01');
    await request(app)
      .post(`/api/teacher/student-registrations/${userId}/reject`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ reason: '学号信息需重新确认' });

    const studentToken = await login(app, 'rejected_s002');
    const results = await request(app).get('/api/student/me/results').set('Authorization', `Bearer ${studentToken}`);
    const diagnosis = await request(app).get('/api/student/me/diagnosis?examId=1').set('Authorization', `Bearer ${studentToken}`);

    expect(results.status).toBe(403);
    expect(results.body.error.code).toBe('FORBIDDEN');
    expect(diagnosis.status).toBe(403);
    expect(diagnosis.body.error.code).toBe('FORBIDDEN');
  });

  it('prevents a student from viewing another student through arbitrary student routes', async () => {
    const userId = await expectPendingRegistration(app, 'S001', 'own_only_s001');
    const teacherToken = await login(app, 'teacher01');
    await request(app)
      .post(`/api/teacher/student-registrations/${userId}/approve`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({});

    const studentToken = await login(app, 'own_only_s001');
    const res = await request(app)
      .get('/api/students/2/exams/1/overview')
      .set('Authorization', `Bearer ${studentToken}`);

    expect([403, 404]).toContain(res.status);
  });

  it('prevents non-teacher users from approving or rejecting student applications', async () => {
    const targetUserId = await expectPendingRegistration(app, 'S001', 'needs_teacher_s001');
    await expectPendingRegistration(app, 'S002', 'student_reviewer_s002');
    const studentToken = await login(app, 'student_reviewer_s002');

    const approve = await request(app)
      .post(`/api/teacher/student-registrations/${targetUserId}/approve`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});
    const reject = await request(app)
      .post(`/api/teacher/student-registrations/${targetUserId}/reject`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ reason: 'not allowed' });

    expect(approve.status).toBe(403);
    expect(approve.body.error.code).toBe('FORBIDDEN');
    expect(reject.status).toBe(403);
    expect(reject.body.error.code).toBe('FORBIDDEN');
  });
});
