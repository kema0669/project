import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { name: string } | undefined;
  return Boolean(row);
}

function tableColumns(db: Database.Database, tableName: string): string[] {
  return (db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[]).map((column) => column.name);
}

function resetLegacySchemaIfNeeded(db: Database.Database): void {
  // 旧版 Demo 使用 students/questions/responses 等固定数学测试表。
  // 新版模型需要 grade_id、subjects、papers 等字段；检测到旧库时自动重建，保证一键启动可直接运行。
  const hasLegacyStudents = tableExists(db, 'students') && !tableColumns(db, 'students').includes('grade_id');
  const hasLegacyQuestions = tableExists(db, 'questions');
  if (!hasLegacyStudents && !hasLegacyQuestions) return;

  db.pragma('foreign_keys = OFF');
  db.exec(`
    DROP TABLE IF EXISTS draft_knowledge_candidates;
    DROP TABLE IF EXISTS paper_question_drafts;
    DROP TABLE IF EXISTS paper_parse_drafts;
    DROP TABLE IF EXISTS question_scores;
    DROP TABLE IF EXISTS student_scores;
    DROP TABLE IF EXISTS imports;
    DROP TABLE IF EXISTS question_knowledge_map;
    DROP TABLE IF EXISTS knowledge_relations;
    DROP TABLE IF EXISTS responses;
    DROP TABLE IF EXISTS paper_questions;
    DROP TABLE IF EXISTS papers;
    DROP TABLE IF EXISTS questions;
    DROP TABLE IF EXISTS exam_batches;
    DROP TABLE IF EXISTS assessments;
    DROP TABLE IF EXISTS students;
    DROP TABLE IF EXISTS grade_subjects;
    DROP TABLE IF EXISTS knowledge_points;
    DROP TABLE IF EXISTS subjects;
    DROP TABLE IF EXISTS grades;
  `);
  db.pragma('foreign_keys = ON');
}

export function initDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  resetLegacySchemaIfNeeded(db);

  // 多学科成绩分析的核心 schema：
  // 年级/学科配置 -> 考试批次 -> 试卷题目 -> 学生成绩 -> 考点映射。
  db.exec(`
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      stage TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS grade_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grade_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      is_required INTEGER NOT NULL DEFAULT 1,
      UNIQUE(grade_id, subject_id),
      FOREIGN KEY (grade_id) REFERENCES grades(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      grade_id INTEGER NOT NULL,
      class_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      joined_at TEXT,
      left_at TEXT,
      FOREIGN KEY (grade_id) REFERENCES grades(id)
    );

    CREATE TABLE IF NOT EXISTS exam_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      term TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      grade_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      total_score REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(exam_id, grade_id, subject_id),
      FOREIGN KEY (exam_id) REFERENCES exam_batches(id),
      FOREIGN KEY (grade_id) REFERENCES grades(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS paper_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id INTEGER NOT NULL,
      question_no INTEGER NOT NULL,
      title TEXT NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'subjective',
      max_score REAL NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(paper_id, question_no),
      FOREIGN KEY (paper_id) REFERENCES papers(id)
    );

    CREATE TABLE IF NOT EXISTS knowledge_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      level INTEGER NOT NULL DEFAULT 1,
      UNIQUE(subject_id, code),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS question_knowledge_map (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_question_id INTEGER NOT NULL,
      knowledge_point_id INTEGER NOT NULL,
      weight REAL NOT NULL DEFAULT 1,
      UNIQUE(paper_question_id, knowledge_point_id),
      FOREIGN KEY (paper_question_id) REFERENCES paper_questions(id),
      FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
    );

    CREATE TABLE IF NOT EXISTS student_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      paper_id INTEGER NOT NULL,
      score REAL NOT NULL,
      class_rank INTEGER,
      grade_rank INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(exam_id, student_id, subject_id),
      FOREIGN KEY (exam_id) REFERENCES exam_batches(id),
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (paper_id) REFERENCES papers(id)
    );

    CREATE TABLE IF NOT EXISTS question_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      paper_question_id INTEGER NOT NULL,
      score REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(exam_id, student_id, paper_question_id),
      FOREIGN KEY (exam_id) REFERENCES exam_batches(id),
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (paper_question_id) REFERENCES paper_questions(id)
    );

    CREATE TABLE IF NOT EXISTS imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER,
      source_file TEXT NOT NULL,
      imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      summary_json TEXT NOT NULL,
      FOREIGN KEY (exam_id) REFERENCES exam_batches(id)
    );

    CREATE TABLE IF NOT EXISTS paper_parse_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      grade_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      source_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'needs_review',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TEXT,
      reviewer_note TEXT,
      FOREIGN KEY (exam_id) REFERENCES exam_batches(id),
      FOREIGN KEY (grade_id) REFERENCES grades(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS paper_question_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_id INTEGER NOT NULL,
      question_no INTEGER NOT NULL,
      title TEXT NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'subjective',
      max_score REAL NOT NULL,
      ai_confidence REAL NOT NULL DEFAULT 0.6,
      teacher_approved INTEGER NOT NULL DEFAULT 0,
      UNIQUE(draft_id, question_no),
      FOREIGN KEY (draft_id) REFERENCES paper_parse_drafts(id)
    );

    CREATE TABLE IF NOT EXISTS draft_knowledge_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_draft_id INTEGER NOT NULL,
      knowledge_point_id INTEGER NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.6,
      reason TEXT,
      teacher_approved INTEGER NOT NULL DEFAULT 0,
      UNIQUE(question_draft_id, knowledge_point_id),
      FOREIGN KEY (question_draft_id) REFERENCES paper_question_drafts(id),
      FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
    );
  `);

  return db;
}
