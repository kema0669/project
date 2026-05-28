import { describe, expect, it, beforeAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import * as XLSX from 'xlsx';

const headers = [
  'student_no',
  'student_name',
  'class_name',
  'exam_name',
  ...Array.from({ length: 20 }, (_, index) => `q${index + 1}`),
];

function workbookBuffer(): Buffer {
  const row = {
    student_no: 'S001',
    student_name: '张三',
    class_name: 'Class A',
    exam_name: 'DINA Diagnostic Quiz',
    ...Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`q${index + 1}`, index % 3 === 0 ? 0 : 1])),
  };
  const worksheet = XLSX.utils.json_to_sheet([row], { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'scores');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

async function login(app: Application, username: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ username, password: 'password123' });
  expect(res.status).toBe(200);
  return res.body.data.token;
}

describe('MVP E2E: teacher upload to student diagnosis', () => {
  let app: Application;

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    const mod = await import('../src/server.js');
    app = mod.default;
  });

  it('should complete the full teacher upload and student result flow', async () => {
    const teacherToken = await login(app, 'teacher01');

    const preview = await request(app)
      .post('/api/teacher/uploads/preview')
      .set('Authorization', `Bearer ${teacherToken}`)
      .field('classId', '1')
      .field('examName', 'DINA Diagnostic Quiz')
      .attach('file', workbookBuffer(), 'scores.xlsx');
    expect(preview.status).toBe(200);
    expect(preview.body.data.summary.errorRowCount).toBe(0);

    const confirm = await request(app)
      .post(`/api/teacher/uploads/${preview.body.data.uploadId}/confirm`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ runDiagnosis: true });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.importedResponses).toBe(20);

    const studentToken = await login(app, 'stu001');
    const results = await request(app).get('/api/student/me/results').set('Authorization', `Bearer ${studentToken}`);
    expect(results.status).toBe(200);
    expect(results.body.data[0]).toMatchObject({
      examId: confirm.body.data.examId,
      total: 20,
    });

    const diagnosis = await request(app)
      .get(`/api/student/me/diagnosis?examId=${confirm.body.data.examId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(diagnosis.status).toBe(200);
    expect(diagnosis.body.data.mastery).toHaveLength(5);
    expect(diagnosis.body.data.recommendation).toEqual(expect.any(String));
    expect(diagnosis.body.data.knowledgeGraph.nodes).toHaveLength(5);
  });
});
