/**
 * SDD 阶段：接口契约（TypeScript）
 *
 * 本文件定义了全系统核心数据结构，作为前端（DDD）、算法（TDD）、API层的唯一事实来源。
 * 所有实现必须遵循这些类型，确保端到端类型安全。
 */

// ==========================================
// 知识图谱层 (Knowledge Graph)
// ==========================================

export interface KnowledgePoint {
  id: number;
  code: string;
  name: string;
  description: string;
  level: number; // 1=基础, 2=进阶, 3=综合
}

export interface KnowledgeRelation {
  id: number;
  fromId: number;
  toId: number;
  relationType: 'prerequisite' | 'postrequisite';
}

/** 知识图谱节点（用于可视化） */
export interface KnowledgeGraphNode {
  id: number;
  name: string;
  level: number;
  masteryProbability?: number; // 由算法层注入
}

/** 知识图谱边（用于可视化） */
export interface KnowledgeGraphEdge {
  from: number;
  to: number;
  relationType: string;
}

// ==========================================
// 题目层 (Question / Q-Matrix)
// ==========================================

export interface Question {
  id: number;
  content: string;
  type: 'single_choice' | 'fill_blank';
  difficulty: number; // 0.0 ~ 1.0
}

/** Q矩阵单项：题目与知识点的关联 */
export interface QuestionKnowledgeMap {
  id: number;
  questionId: number;
  knowledgePointId: number;
  weight: 0 | 1; // 1=考察该知识点, 0=不考察
}

/** 扁平化的Q矩阵行，便于算法层直接消费 */
export interface QMatrixRow {
  questionId: number;
  knowledgePointId: number;
  weight: 0 | 1;
}

// ==========================================
// 学生作答层 (Student / X-Matrix)
// ==========================================

export interface Student {
  id: number;
  name: string;
}

export interface Response {
  id: number;
  studentId: number;
  questionId: number;
  isCorrect: 0 | 1;
  responseTime?: number; // ms
  createdAt: string; // ISO 8601
}

/** 扁平化的X矩阵行，便于算法层直接消费 */
export interface XMatrixRow {
  studentId: number;
  questionId: number;
  isCorrect: 0 | 1;
}

// ==========================================
// 算法层输出 (Diagnosis Result)
// ==========================================

/** 单个知识点的诊断结果 */
export interface KnowledgeMastery {
  knowledgePointId: number;
  knowledgePointName: string;
  masteryProbability: number; // 0.0 ~ 1.0
}

/** DINA模型原始输出（含猜测率、失误率等参数，用于调试与论文场景） */
export interface DinaParams {
  slip: number; // 失误率 s
  guess: number; // 猜测率 g
  eta: number[]; // 理想作答模式
}

export interface DiagnosisResult {
  studentId: number;
  studentName: string;
  overallMastery: number; // 综合掌握度（各知识点平均值）
  knowledges: KnowledgeMastery[];
  dinaParams?: DinaParams; // 可选：模型参数详情
  suggestedNextSteps?: string[]; // 可选：后续学习路径（由知识图谱推导）
}

// ==========================================
// API 请求/响应契约
// ==========================================

export interface DiagnosisRequest {
  studentId: number;
}

export interface DiagnosisResponse {
  success: boolean;
  data?: DiagnosisResult;
  error?: string;
}

/** 个性化学习建议请求 */
export interface SuggestionRequest {
  studentId: number;
  diagnosisResult: DiagnosisResult;
}

export interface SuggestionResponse {
  success: boolean;
  suggestion?: string; // LLM生成的自然语言建议
  error?: string;
}

// ==========================================
// 前端可视化层专用类型（DDD阶段消费）
// ==========================================

export interface RadarChartData {
  indicator: { name: string; max: 1 }[];
  values: number[];
}

export interface StudentOption {
  id: number;
  name: string;
}
