import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabase } from '../src/db.js';
import { seedData } from '../src/seed.js';
import { runDiagnosis, getQMatrix, getXMatrix } from '../src/diagnosis.js';

describe('Integration: DB + DINA Algorithm (TDD)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = initDatabase(':memory:');
    seedData(db);
  });

  it('should export Q matrix from database', () => {
    const qMatrix = getQMatrix(db);
    expect(qMatrix.length).toBe(100); // 20 x 5
    const nonZero = qMatrix.filter((r) => r.weight === 1);
    expect(nonZero.length).toBeGreaterThan(0);
  });

  it('should export X matrix from database', () => {
    const xMatrix = getXMatrix(db);
    expect(xMatrix.length).toBe(200); // 10 x 20
  });

  it('should run diagnosis and return probabilities in [0, 1]', () => {
    const result = runDiagnosis(db);
    expect(result.length).toBe(50); // 10 students x 5 knowledge points
    for (const r of result) {
      expect(r.probability).toBeGreaterThanOrEqual(0);
      expect(r.probability).toBeLessThanOrEqual(1);
    }
  });

  it('should rank top student higher than weak student', () => {
    const result = runDiagnosis(db);

    const zhangsan = result.filter((r) => r.studentId === 1);
    const wangwu = result.filter((r) => r.studentId === 3);

    const zhangsanAvg =
      zhangsan.reduce((sum, r) => sum + r.probability, 0) / zhangsan.length;
    const wangwuAvg =
      wangwu.reduce((sum, r) => sum + r.probability, 0) / wangwu.length;

    expect(zhangsanAvg).toBeGreaterThan(wangwuAvg);
  });

  it('should produce differentiated mastery per knowledge point', () => {
    const result = runDiagnosis(db);

    // Student 2 (李四) should have higher mastery on KP1/KP2 than KP4/KP5
    const liSiKP1 = result.find((r) => r.studentId === 2 && r.knowledgePointId === 1)!;
    const liSiKP4 = result.find((r) => r.studentId === 2 && r.knowledgePointId === 4)!;
    expect(liSiKP1.probability).toBeGreaterThan(liSiKP4.probability);
  });
});
