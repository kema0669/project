import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';

describe('E2E: Full Stack Integration', () => {
  let app: Application;

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    const mod = await import('../src/server.js');
    app = mod.default;
  });

  it('GET /api/students should return 10 students', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(200);
    expect(res.body.students).toHaveLength(10);
    expect(res.body.students[0].name).toBe('张三');
  });

  it('GET /api/knowledge-points should return 5 knowledge points', async () => {
    const res = await request(app).get('/api/knowledge-points');
    expect(res.status).toBe(200);
    expect(res.body.knowledgePoints).toHaveLength(5);
  });

  it('GET /api/knowledge-relations should return 3 relations', async () => {
    const res = await request(app).get('/api/knowledge-relations');
    expect(res.status).toBe(200);
    expect(res.body.relations).toHaveLength(3);
  });

  it('GET /api/diagnosis/:studentId should return valid diagnosis', async () => {
    const res = await request(app).get('/api/diagnosis/1');
    expect(res.status).toBe(200);
    expect(res.body.studentName).toBe('张三');
    expect(res.body.overallMastery).toBeGreaterThan(0);
    expect(res.body.knowledges).toHaveLength(5);
    for (const k of res.body.knowledges) {
      expect(k.masteryProbability).toBeGreaterThanOrEqual(0);
      expect(k.masteryProbability).toBeLessThanOrEqual(1);
    }
  });

  it('GET /api/diagnosis/999 should return 404', async () => {
    const res = await request(app).get('/api/diagnosis/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Student not found');
  });

  it('should rank top student higher than weak student via API', async () => {
    const [res1, res3] = await Promise.all([
      request(app).get('/api/diagnosis/1'),
      request(app).get('/api/diagnosis/3'),
    ]);
    expect(res1.body.overallMastery).toBeGreaterThan(res3.body.overallMastery);
  });

  it('POST /api/diagnosis/suggest should return personalized suggestion', async () => {
    const diagnosisRes = await request(app).get('/api/diagnosis/2');
    expect(diagnosisRes.status).toBe(200);

    const res = await request(app)
      .post('/api/diagnosis/suggest')
      .send({ diagnosisResult: diagnosisRes.body });

    expect(res.status).toBe(200);
    expect(typeof res.body.suggestion).toBe('string');
    expect(res.body.suggestion.length).toBeGreaterThan(0);
  });
});
