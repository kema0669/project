import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabase } from '../src/db.js';
import { seedData } from '../src/seed.js';
import { confirmPaperDraft, createPaperDraft, getPaperDraft } from '../src/paperDrafts.js';

describe('AI-assisted paper parsing draft workflow', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = initDatabase(':memory:');
    seedData(db);
  });

  it('should create a teacher-review draft with AI candidate knowledge points', () => {
    const draft = createPaperDraft(db, {
      examId: 3,
      gradeId: 2,
      subjectId: 4,
      sourceName: '八年级物理试卷.docx',
      questions: [
        { questionNo: 1, title: '分析小车运动状态', maxScore: 10, questionType: 'application' },
        { questionNo: 2, title: '声现象实验题', maxScore: 12, questionType: 'experiment' },
      ],
    });

    expect(draft.status).toBe('needs_review');
    expect(draft.questions).toHaveLength(2);
    expect(draft.questions[0].candidates.length).toBeGreaterThan(0);
    expect(draft.questions[0].teacherApproved).toBe(false);
  });

  it('should load and confirm a draft without mutating official paper questions', () => {
    const beforeCount = db.prepare('SELECT COUNT(*) AS cnt FROM paper_questions').get() as { cnt: number };
    const created = createPaperDraft(db, {
      examId: 3,
      gradeId: 2,
      subjectId: 4,
      sourceName: 'teacher-upload.xlsx',
      questions: [{ questionNo: 1, title: '浮力基础题', maxScore: 8 }],
    });

    const loaded = getPaperDraft(db, created.id);
    expect(loaded?.questions[0].title).toBe('浮力基础题');

    const confirmed = confirmPaperDraft(db, created.id, '老师已确认候选考点，等待正式入库策略');
    const afterCount = db.prepare('SELECT COUNT(*) AS cnt FROM paper_questions').get() as { cnt: number };

    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.reviewerNote).toContain('老师已确认');
    expect(afterCount.cnt).toBe(beforeCount.cnt);
  });
});
