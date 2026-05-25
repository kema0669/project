import Database from 'better-sqlite3';

export function initDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      level INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS knowledge_relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id INTEGER NOT NULL,
      to_id INTEGER NOT NULL,
      relation_type TEXT NOT NULL DEFAULT 'prerequisite',
      FOREIGN KEY (from_id) REFERENCES knowledge_points(id),
      FOREIGN KEY (to_id) REFERENCES knowledge_points(id)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'single_choice',
      difficulty REAL NOT NULL DEFAULT 0.5
    );

    CREATE TABLE IF NOT EXISTS question_knowledge_map (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      knowledge_point_id INTEGER NOT NULL,
      weight INTEGER NOT NULL DEFAULT 1,
      UNIQUE(question_id, knowledge_point_id),
      FOREIGN KEY (question_id) REFERENCES questions(id),
      FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      is_correct INTEGER NOT NULL,
      response_time INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, question_id),
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );
  `);

  return db;
}
