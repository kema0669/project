import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabase } from '../src/db.js';
import { seedData } from '../src/seed.js';

function tableNames(db: Database.Database): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {
      name: string;
    }[]
  ).map((table) => table.name);
}

describe('MVP contract: SDD SQLite schema and seed data', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = initDatabase(':memory:');
    seedData(db);
  });

  it('should create the MVP diagnosis tables from docs/schema.md', () => {
    const names = tableNames(db);

    expect(names).toEqual(
      expect.arrayContaining([
        'users',
        'classes',
        'students',
        'knowledge_points',
        'knowledge_relations',
        'exams',
        'questions',
        'q_matrix',
        'uploads',
        'responses',
        'diagnosis_results',
        'recommendations',
      ])
    );
  });

  it('should seed one teacher and at least ten student login accounts', () => {
    const teacher = db.prepare("SELECT username, role FROM users WHERE username = 'teacher01'").get() as
      | { username: string; role: string }
      | undefined;
    const students = db.prepare("SELECT COUNT(*) AS cnt FROM users WHERE role = 'student'").get() as { cnt: number };

    expect(teacher).toEqual({ username: 'teacher01', role: 'teacher' });
    expect(students.cnt).toBeGreaterThanOrEqual(10);
  });

  it('should seed five knowledge points and a 20-question Q matrix', () => {
    const knowledgeCount = db.prepare("SELECT COUNT(*) AS cnt FROM knowledge_points WHERE code LIKE 'kp_%'").get() as {
      cnt: number;
    };
    const questionCount = db.prepare('SELECT COUNT(*) AS cnt FROM questions').get() as { cnt: number };
    const mappedQuestionCount = db.prepare('SELECT COUNT(DISTINCT question_id) AS cnt FROM q_matrix').get() as {
      cnt: number;
    };

    expect(knowledgeCount.cnt).toBe(5);
    expect(questionCount.cnt).toBe(20);
    expect(mappedQuestionCount.cnt).toBe(20);
  });
});
