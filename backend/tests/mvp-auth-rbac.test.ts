import { describe, expect, it, beforeAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';

describe('MVP contract: auth and role-based access control', () => {
  let app: Application;

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    const mod = await import('../src/server.js');
    app = mod.default;
  });

  it('POST /api/auth/login should authenticate a teacher account', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'teacher01',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      username: 'teacher01',
      role: 'teacher',
    });
  });

  it('POST /api/auth/login should authenticate a student account', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'stu001',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      username: 'stu001',
      role: 'student',
    });
  });

  it('should reject teacher APIs when called with a student token', async () => {
    const login = await request(app).post('/api/auth/login').send({
      username: 'stu001',
      password: 'password123',
    });
    expect(login.status).toBe(200);

    const res = await request(app)
      .get('/api/teacher/classes')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should not expose arbitrary student diagnosis routes to student users', async () => {
    const login = await request(app).post('/api/auth/login').send({
      username: 'stu001',
      password: 'password123',
    });
    expect(login.status).toBe(200);

    const res = await request(app)
      .get('/api/students/2/diagnosis?examId=1')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect([403, 404]).toContain(res.status);
  });

  it('GET /api/student/me/results should only return the current student score list', async () => {
    const login = await request(app).post('/api/auth/login').send({
      username: 'stu001',
      password: 'password123',
    });
    expect(login.status).toBe(200);

    const res = await request(app)
      .get('/api/student/me/results')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    for (const row of res.body.data) {
      expect(row).not.toHaveProperty('otherStudentId');
      expect(row).toHaveProperty('examId');
      expect(row).toHaveProperty('score');
      expect(row).toHaveProperty('total');
    }
  });
});
