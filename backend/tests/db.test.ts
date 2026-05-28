import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabase } from '../src/db.js';
import { seedData } from '../src/seed.js';

describe('Database Layer: multi-subject score model', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = initDatabase(':memory:');
    seedData(db);
  });

  it('should create the multi-subject core tables', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);

    expect(names).toContain('grades');
    expect(names).toContain('subjects');
    expect(names).toContain('grade_subjects');
    expect(names).toContain('students');
    expect(names).toContain('exam_batches');
    expect(names).toContain('papers');
    expect(names).toContain('paper_questions');
    expect(names).toContain('student_scores');
    expect(names).toContain('question_scores');
    expect(names).toContain('knowledge_points');
    expect(names).toContain('question_knowledge_map');
    expect(names).toContain('paper_parse_drafts');
    expect(names).toContain('paper_question_drafts');
    expect(names).toContain('draft_knowledge_candidates');
  });

  it('should seed 3 grades and 9 subjects', () => {
    const gradeCount = db.prepare('SELECT COUNT(*) AS cnt FROM grades').get() as { cnt: number };
    const subjectCount = db.prepare('SELECT COUNT(*) AS cnt FROM subjects').get() as { cnt: number };

    expect(gradeCount.cnt).toBe(3);
    expect(subjectCount.cnt).toBe(9);
  });

  it('should configure different subjects for different grades', () => {
    const grade7 = db
      .prepare(`
        SELECT sub.code
        FROM grade_subjects gs
        JOIN subjects sub ON sub.id = gs.subject_id
        WHERE gs.grade_id = 1
        ORDER BY sub.display_order
      `)
      .all() as { code: string }[];
    const grade9 = db
      .prepare(`
        SELECT sub.code
        FROM grade_subjects gs
        JOIN subjects sub ON sub.id = gs.subject_id
        WHERE gs.grade_id = 3
        ORDER BY sub.display_order
      `)
      .all() as { code: string }[];

    expect(grade7.map((s) => s.code)).toContain('biology');
    expect(grade7.map((s) => s.code)).not.toContain('physics');
    expect(grade9.map((s) => s.code)).toContain('chemistry');
    expect(grade9.map((s) => s.code)).not.toContain('biology');
  });

  it('should seed at least 3 students per grade', () => {
    const rows = db
      .prepare('SELECT grade_id AS gradeId, COUNT(*) AS cnt FROM students GROUP BY grade_id ORDER BY grade_id')
      .all() as { gradeId: number; cnt: number }[];

    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.cnt).toBeGreaterThanOrEqual(3);
  });

  it('should seed 3 exam batches', () => {
    const rows = db.prepare('SELECT COUNT(*) AS cnt FROM exam_batches').get() as { cnt: number };
    expect(rows.cnt).toBe(3);
  });

  it('should create papers only for subjects studied by each grade', () => {
    const grade7Physics = db
      .prepare(`
        SELECT COUNT(*) AS cnt
        FROM papers p
        JOIN subjects s ON s.id = p.subject_id
        WHERE p.grade_id = 1 AND s.code = 'physics'
      `)
      .get() as { cnt: number };
    const grade8Physics = db
      .prepare(`
        SELECT COUNT(*) AS cnt
        FROM papers p
        JOIN subjects s ON s.id = p.subject_id
        WHERE p.grade_id = 2 AND s.code = 'physics'
      `)
      .get() as { cnt: number };

    expect(grade7Physics.cnt).toBe(0);
    expect(grade8Physics.cnt).toBe(3);
  });

  it('should seed subject total scores and question scores', () => {
    const totalScores = db.prepare('SELECT COUNT(*) AS cnt FROM student_scores').get() as { cnt: number };
    const questionScores = db.prepare('SELECT COUNT(*) AS cnt FROM question_scores').get() as { cnt: number };

    expect(totalScores.cnt).toBeGreaterThan(0);
    expect(questionScores.cnt).toBeGreaterThan(totalScores.cnt);
  });

  it('should store class and grade ranks for subject scores', () => {
    const row = db
      .prepare(`
        SELECT class_rank AS classRank, grade_rank AS gradeRank
        FROM student_scores
        WHERE class_rank IS NOT NULL AND grade_rank IS NOT NULL
        LIMIT 1
      `)
      .get() as { classRank: number; gradeRank: number } | undefined;

    expect(row).toBeDefined();
    expect(row!.classRank).toBeGreaterThanOrEqual(1);
    expect(row!.gradeRank).toBeGreaterThanOrEqual(1);
  });

  it('should map paper questions to subject knowledge points', () => {
    const mapped = db.prepare('SELECT COUNT(*) AS cnt FROM question_knowledge_map').get() as { cnt: number };
    const questions = db.prepare('SELECT COUNT(*) AS cnt FROM paper_questions').get() as { cnt: number };

    expect(mapped.cnt).toBeGreaterThanOrEqual(questions.cnt);
  });
});
