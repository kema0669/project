import Database from 'better-sqlite3';
import { estimateDINA } from './algorithm/dina.js';
import type { QMatrixEntry, XMatrixEntry, MasteryProbability } from './types.js';

/** 从数据库导出完整 Q 矩阵（题目 × 知识点） */
export function getQMatrix(db: Database.Database): QMatrixEntry[] {
  return db
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
}

/** 从数据库导出完整 X 矩阵（学生 × 题目） */
export function getXMatrix(db: Database.Database): XMatrixEntry[] {
  return db
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
}

/**
 * 运行认知诊断：从数据库读取 Q/X 矩阵，调用 DINA 算法估计掌握概率。
 */
export function runDiagnosis(db: Database.Database): MasteryProbability[] {
  const qMatrix = getQMatrix(db);
  const xMatrix = getXMatrix(db);
  return estimateDINA(qMatrix, xMatrix);
}
