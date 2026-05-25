import type { DiagnosisResult, StudentOption, KnowledgePoint, KnowledgeRelation } from '../types';

export const mockStudents: StudentOption[] = [
  { id: 1, name: '张三' },
  { id: 2, name: '李四' },
  { id: 3, name: '王五' },
  { id: 4, name: '赵六' },
  { id: 5, name: '孙七' },
  { id: 6, name: '周八' },
  { id: 7, name: '吴九' },
  { id: 8, name: '郑十' },
  { id: 9, name: '钱十一' },
  { id: 10, name: '陈十二' },
];

export const mockKnowledgePoints: KnowledgePoint[] = [
  { id: 1, code: 'addition_basic', name: '加法基础', description: '掌握10以内及20以内的加法运算规则', level: 1 },
  { id: 2, code: 'subtraction_basic', name: '减法基础', description: '掌握10以内及20以内的减法运算规则', level: 1 },
  { id: 3, code: 'mixed_add_sub', name: '加减混合运算', description: '能够综合运用加法与减法解决多步问题', level: 2 },
  { id: 4, code: 'multiplication_basic', name: '乘法基础', description: '掌握乘法口诀表及基本乘法运算', level: 1 },
  { id: 5, code: 'mixed_mul_div', name: '乘除混合运算', description: '能够综合运用乘法与除法解决多步问题', level: 2 },
];

export const mockKnowledgeRelations: KnowledgeRelation[] = [
  { id: 1, fromId: 1, toId: 3, relationType: 'prerequisite' },
  { id: 2, fromId: 2, toId: 3, relationType: 'prerequisite' },
  { id: 3, fromId: 4, toId: 5, relationType: 'prerequisite' },
];

/**
 * 三种典型学生画像的 mock 诊断数据
 */
export const mockDiagnosisResults: Record<number, DiagnosisResult> = {
  // 1. 学霸型（张三）：全知识点掌握度 >85%
  1: {
    studentId: 1,
    studentName: '张三',
    overallMastery: 0.94,
    knowledges: [
      { knowledgePointId: 1, knowledgePointName: '加法基础', masteryProbability: 0.98 },
      { knowledgePointId: 2, knowledgePointName: '减法基础', masteryProbability: 0.95 },
      { knowledgePointId: 3, knowledgePointName: '加减混合运算', masteryProbability: 0.92 },
      { knowledgePointId: 4, knowledgePointName: '乘法基础', masteryProbability: 0.96 },
      { knowledgePointId: 5, knowledgePointName: '乘除混合运算', masteryProbability: 0.88 },
    ],
    suggestedNextSteps: ['加减混合运算', '乘除混合运算'],
  },
  // 2. 偏科型（李四）：加减运算强，乘除运算弱
  2: {
    studentId: 2,
    studentName: '李四',
    overallMastery: 0.62,
    knowledges: [
      { knowledgePointId: 1, knowledgePointName: '加法基础', masteryProbability: 0.92 },
      { knowledgePointId: 2, knowledgePointName: '减法基础', masteryProbability: 0.88 },
      { knowledgePointId: 3, knowledgePointName: '加减混合运算', masteryProbability: 0.85 },
      { knowledgePointId: 4, knowledgePointName: '乘法基础', masteryProbability: 0.35 },
      { knowledgePointId: 5, knowledgePointName: '乘除混合运算', masteryProbability: 0.20 },
    ],
    suggestedNextSteps: ['乘法基础', '乘除混合运算'],
  },
  // 3. 薄弱型（王五）：多数知识点 <50%
  3: {
    studentId: 3,
    studentName: '王五',
    overallMastery: 0.38,
    knowledges: [
      { knowledgePointId: 1, knowledgePointName: '加法基础', masteryProbability: 0.55 },
      { knowledgePointId: 2, knowledgePointName: '减法基础', masteryProbability: 0.42 },
      { knowledgePointId: 3, knowledgePointName: '加减混合运算', masteryProbability: 0.25 },
      { knowledgePointId: 4, knowledgePointName: '乘法基础', masteryProbability: 0.35 },
      { knowledgePointId: 5, knowledgePointName: '乘除混合运算', masteryProbability: 0.15 },
    ],
    suggestedNextSteps: ['加法基础', '减法基础', '乘法基础'],
  },
};

/**
 * 为其余学生生成随机但合理的诊断数据
 */
function generateRandomDiagnosis(student: StudentOption): DiagnosisResult {
  const baseKnowledges = mockKnowledgePoints.map(kp => ({
    knowledgePointId: kp.id,
    knowledgePointName: kp.name,
    masteryProbability: Math.round((Math.random() * 0.6 + 0.2) * 100) / 100,
  }));

  const overall = Math.round((baseKnowledges.reduce((s, k) => s + k.masteryProbability, 0) / baseKnowledges.length) * 100) / 100;
  const weakOnes = baseKnowledges.filter(k => k.masteryProbability < 0.5).map(k => k.knowledgePointName);

  return {
    studentId: student.id,
    studentName: student.name,
    overallMastery: overall,
    knowledges: baseKnowledges,
    suggestedNextSteps: weakOnes.length > 0 ? weakOnes.slice(0, 3) : [baseKnowledges[0].knowledgePointName],
  };
}

// 填充剩余学生数据
for (const student of mockStudents) {
  if (!mockDiagnosisResults[student.id]) {
    mockDiagnosisResults[student.id] = generateRandomDiagnosis(student);
  }
}

/**
 * 模拟异步获取诊断结果（DDD阶段用mock数据，E2E阶段替换为真实API）
 */
export function fetchDiagnosisResult(studentId: number): Promise<DiagnosisResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockDiagnosisResults[studentId]);
    }, 300); // 模拟网络延迟 300ms
  });
}
