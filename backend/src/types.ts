/**
 * TDD 阶段：共享类型定义
 * 严格继承 SDD 阶段的 schema 契约
 */

export interface KnowledgePoint {
  id: number;
  code: string;
  name: string;
  description: string;
  level: number;
}

export interface KnowledgeRelation {
  id: number;
  fromId: number;
  toId: number;
  relationType: 'prerequisite' | 'postrequisite';
}

export interface Question {
  id: number;
  content: string;
  type: string;
  difficulty: number;
}

export interface QuestionKnowledgeMap {
  id: number;
  questionId: number;
  knowledgePointId: number;
  weight: number;
}

export interface Student {
  id: number;
  name: string;
}

export interface Response {
  id: number;
  studentId: number;
  questionId: number;
  isCorrect: number;
  responseTime?: number;
  createdAt?: string;
}

/** 算法层输出 */
export interface MasteryProbability {
  studentId: number;
  knowledgePointId: number;
  probability: number;
}

/** Q 矩阵：题目 × 知识点 */
export interface QMatrixEntry {
  questionId: number;
  knowledgePointId: number;
  weight: number;
}

/** X 矩阵：学生 × 题目 */
export interface XMatrixEntry {
  studentId: number;
  questionId: number;
  isCorrect: number;
}
