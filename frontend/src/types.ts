/**
 * DDD 阶段：前端类型定义
 * 从 SDD 阶段的 src/types.ts 中提取前端所需类型
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

export interface KnowledgeMastery {
  knowledgePointId: number;
  knowledgePointName: string;
  masteryProbability: number;
}

export interface DiagnosisResult {
  studentId: number;
  studentName: string;
  overallMastery: number;
  knowledges: KnowledgeMastery[];
  suggestedNextSteps?: string[];
}

export interface StudentOption {
  id: number;
  name: string;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
