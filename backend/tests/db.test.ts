import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabase } from '../src/db.js';
import { seedData } from '../src/seed.js';
import type { QMatrixEntry, XMatrixEntry } from '../src/types.js';

describe('Database Layer (TDD)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = initDatabase(':memory:');
    seedData(db);
  });

  it('should create all 6 tables', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain('knowledge_points');
    expect(names).toContain('knowledge_relations');
    expect(names).toContain('questions');
    expect(names).toContain('question_knowledge_map');
    expect(names).toContain('students');
    expect(names).toContain('responses');
  });

  it('should seed 5 knowledge points', () => {
    const rows = db.prepare('SELECT COUNT(*) as cnt FROM knowledge_points').get() as { cnt: number };
    expect(rows.cnt).toBe(5);
  });

  it('should seed 3 knowledge relations', () => {
    const rows = db.prepare('SELECT COUNT(*) as cnt FROM knowledge_relations').get() as { cnt: number };
    expect(rows.cnt).toBe(3);
  });

  it('should seed 20 questions', () => {
    const rows = db.prepare('SELECT COUNT(*) as cnt FROM questions').get() as { cnt: number };
    expect(rows.cnt).toBe(20);
  });

  it('should seed 10 students', () => {
    const rows = db.prepare('SELECT COUNT(*) as cnt FROM students').get() as { cnt: number };
    expect(rows.cnt).toBe(10);
  });

  it('should seed responses for all students on all questions', () => {
    const rows = db.prepare('SELECT COUNT(*) as cnt FROM responses').get() as { cnt: number };
    expect(rows.cnt).toBe(200); // 10 students × 20 questions
  });

  it('should export Q matrix with correct shape', () => {
    const qMatrix = db
      .prepare(`
        SELECT q.id AS questionId,
               kp.id AS knowledgePointId,
               COALESCE(qkm.weight, 0) AS weight
        FROM questions q
        CROSS JOIN knowledge_points kp
        LEFT JOIN question_knowledge_map qkm
          ON qkm.question_id = q.id AND qkm.knowledge_point_id = kp.id
        ORDER BY q.id, kp.id
      `)
      .all() as QMatrixEntry[];

    expect(qMatrix.length).toBe(100); // 20 × 5

    const nonZero = qMatrix.filter((r) => r.weight === 1);
    expect(nonZero.length).toBeGreaterThan(0);

    // Verify specific mapping: question 1 should test knowledge point 1
    const q1k1 = qMatrix.find((r) => r.questionId === 1 && r.knowledgePointId === 1);
    expect(q1k1).toBeDefined();
    expect(q1k1!.weight).toBe(1);
  });

  it('should export X matrix with correct shape', () => {
    const xMatrix = db
      .prepare(`
        SELECT s.id AS studentId,
               q.id AS questionId,
               COALESCE(r.is_correct, 0) AS isCorrect
        FROM students s
        CROSS JOIN questions q
        LEFT JOIN responses r
          ON r.student_id = s.id AND r.question_id = q.id
        ORDER BY s.id, q.id
      `)
      .all() as XMatrixEntry[];

    expect(xMatrix.length).toBe(200); // 10 × 20

    // Verify student 1 (top student) has mostly correct answers
    const student1 = xMatrix.filter((r) => r.studentId === 1);
    const correctCount = student1.filter((r) => r.isCorrect === 1).length;
    expect(correctCount).toBeGreaterThanOrEqual(16); // at least 80%
  });
});
