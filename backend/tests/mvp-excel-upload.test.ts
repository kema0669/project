import { describe, expect, it, beforeAll } from 'vitest';
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

function workbookBuffer(rows: Record<string, string | number>[], workbookHeaders = headers): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: workbookHeaders });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'scores');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function validRow(overrides: Partial<Record<string, string | number>> = {}): Record<string, string | number> {
  return {
    student_no: 'S001',
    student_name: 'Alice',
    class_name: 'Class A',
    exam_name: 'DINA Diagnostic Quiz',
    ...Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`q${index + 1}`, index % 2 === 0 ? 1 : 0])),
    ...overrides,
  };
}

async function teacherToken(app: Application): Promise<string> {
  const login = await request(app).post('/api/auth/login').send({
    username: 'teacher01',
    password: 'password123',
  });
  expect(login.status).toBe(200);
  return login.body.data.token;
}

describe('MVP contract: fixed Excel upload preview and confirm', () => {
  let app: Application;
  let db: Database.Database;

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    const mod = await import('../src/server.js');
    app = mod.default;
    db = mod.db;
  });

  it('POST /api/teacher/uploads/preview should parse a valid fixed template without importing responses', async () => {
    const token = await teacherToken(app);
    const before = db.prepare('SELECT COUNT(*) AS cnt FROM responses').get() as { cnt: number };

    const res = await request(app)
      .post('/api/teacher/uploads/preview')
      .set('Authorization', `Bearer ${token}`)
      .field('classId', '1')
      .field('examName', 'DINA Diagnostic Quiz')
      .attach('file', workbookBuffer([validRow()]), 'scores.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('previewed');
    expect(res.body.data.summary).toMatchObject({
      rowCount: 1,
      validRowCount: 1,
      errorRowCount: 0,
      questionCount: 20,
    });
    expect(res.body.data.rows[0].errors).toEqual([]);

    const after = db.prepare('SELECT COUNT(*) AS cnt FROM responses').get() as { cnt: number };
    expect(after.cnt).toBe(before.cnt);
  });

  it('POST /api/teacher/uploads/preview should reject a template with missing required columns', async () => {
    const token = await teacherToken(app);
    const row = validRow();
    delete row.q20;

    const res = await request(app)
      .post('/api/teacher/uploads/preview')
      .set('Authorization', `Bearer ${token}`)
      .field('classId', '1')
      .field('examName', 'DINA Diagnostic Quiz')
      .attach('file', workbookBuffer([row], headers.filter((header) => header !== 'q20')), 'missing-column.xlsx');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'q20' })])
    );
  });

  it('POST /api/teacher/uploads/preview should reject q1-q20 values outside 0 or 1', async () => {
    const token = await teacherToken(app);

    const res = await request(app)
      .post('/api/teacher/uploads/preview')
      .set('Authorization', `Bearer ${token}`)
      .field('classId', '1')
      .field('examName', 'DINA Diagnostic Quiz')
      .attach('file', workbookBuffer([validRow({ q7: 2 })]), 'invalid-answer.xlsx');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowNumber: 2,
          field: 'q7',
        }),
      ])
    );
  });

  it('POST /api/teacher/uploads/:uploadId/confirm should import responses and create diagnosis results', async () => {
    const token = await teacherToken(app);
    const preview = await request(app)
      .post('/api/teacher/uploads/preview')
      .set('Authorization', `Bearer ${token}`)
      .field('classId', '1')
      .field('examName', 'DINA Diagnostic Quiz')
      .attach('file', workbookBuffer([validRow()]), 'scores.xlsx');
    expect(preview.status).toBe(200);

    const res = await request(app)
      .post(`/api/teacher/uploads/${preview.body.data.uploadId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ runDiagnosis: true });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      uploadId: preview.body.data.uploadId,
      status: 'confirmed',
      importedResponses: 20,
      diagnosedStudents: 1,
    });

    const responses = db.prepare('SELECT COUNT(*) AS cnt FROM responses').get() as { cnt: number };
    const diagnosis = db.prepare('SELECT COUNT(*) AS cnt FROM diagnosis_results').get() as { cnt: number };
    expect(responses.cnt).toBeGreaterThanOrEqual(20);
    expect(diagnosis.cnt).toBeGreaterThanOrEqual(5);
  });
});
