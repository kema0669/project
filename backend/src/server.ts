/**
 * Stage 4: 整合层 — 极简 Express REST API
 * 将数据库层与 DINA 算法层通过 HTTP 暴露给前端。
 */

import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import { seedData } from './seed.js';
import { runDiagnosis } from './diagnosis.js';
// 内联定义 API 响应类型，避免跨目录依赖前端源码
interface KnowledgeMastery {
  knowledgePointId: number;
  knowledgePointName: string;
  masteryProbability: number;
}

interface DiagnosisResult {
  studentId: number;
  studentName: string;
  overallMastery: number;
  knowledges: KnowledgeMastery[];
  suggestedNextSteps?: string[];
}

const app = express();
app.use(cors());
app.use(express.json());

// 初始化持久化数据库（开发/生产用文件，E2E 测试可注入内存库）
const DB_PATH = process.env.DB_PATH || 'data/cdi.db';
export const db = initDatabase(DB_PATH);

// 仅在表为空时执行种子数据（避免重复插入）
const kpCount = (db.prepare('SELECT COUNT(*) as cnt FROM knowledge_points').get() as { cnt: number }).cnt;
if (kpCount === 0) {
  seedData(db);
}

/** 工具：生成学习建议（优先 LLM，退化到规则模板） */
async function generateSuggestion(result: DiagnosisResult): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: '你是一位资深数学教育专家。请根据学生的认知诊断结果，生成一段简短（100字以内）、鼓励性的个性化学习建议。指出薄弱环节并给出具体行动建议。',
            },
            {
              role: 'user',
              content: `学生：${result.studentName}，综合掌握度：${(result.overallMastery * 100).toFixed(0)}%。各知识点掌握度：${result.knowledges.map(k => `${k.knowledgePointName} ${(k.masteryProbability * 100).toFixed(0)}%`).join('、')}。`,
            },
          ],
          temperature: 0.7,
        }),
      });
      if (response.ok) {
        const data = await response.json() as { choices: { message: { content: string } }[] };
        return data.choices[0].message.content.trim();
      }
    } catch {
      // fallback to rule-based
    }
  }

  // 规则模板退化方案
  const weakPoints = result.knowledges
    .filter((k) => k.masteryProbability < 0.5)
    .map((k) => k.knowledgePointName);
  const strongPoints = result.knowledges
    .filter((k) => k.masteryProbability >= 0.8)
    .map((k) => k.knowledgePointName);

  if (weakPoints.length === 0) {
    return `🎉 ${result.studentName}的整体表现非常出色！所有知识点的掌握度均在80%以上。建议适当进行拓展性练习，挑战更高难度的综合应用题，保持领先优势。`;
  }
  if (strongPoints.length === 0) {
    return `📚 ${result.studentName}目前在各知识点的掌握上均有较大提升空间。建议从最基础的「${result.knowledges[0].knowledgePointName}」开始，循序渐进地进行系统复习，夯实根基后再逐步推进。`;
  }
  return `👍 ${result.studentName}在「${strongPoints.join('、')}」方面表现优秀，但在「${weakPoints.join('、')}」上还需加强。建议优先针对薄弱环节进行专项训练：先回顾相关基础概念，再通过针对性练习题巩固，最后尝试中等难度的综合题进行检验。`;
}

// ─── API 路由 ───

/** GET /api/students */
app.get('/api/students', (_req, res) => {
  const rows = db.prepare('SELECT id, name FROM students ORDER BY id').all() as { id: number; name: string }[];
  res.json({ students: rows });
});

/** GET /api/knowledge-points */
app.get('/api/knowledge-points', (_req, res) => {
  const rows = db.prepare('SELECT id, code, name, description, level FROM knowledge_points ORDER BY id').all();
  res.json({ knowledgePoints: rows });
});

/** GET /api/knowledge-relations */
app.get('/api/knowledge-relations', (_req, res) => {
  const rows = db.prepare('SELECT id, from_id as fromId, to_id as toId, relation_type as relationType FROM knowledge_relations ORDER BY id').all();
  res.json({ relations: rows });
});

/** GET /api/diagnosis/:studentId */
app.get('/api/diagnosis/:studentId', (req, res) => {
  const studentId = Number(req.params.studentId);
  const student = db.prepare('SELECT id, name FROM students WHERE id = ?').get(studentId) as { id: number; name: string } | undefined;
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  const allResults = runDiagnosis(db);
  const studentResults = allResults.filter((r) => r.studentId === studentId);

  const knowledges: KnowledgeMastery[] = studentResults.map((r) => ({
    knowledgePointId: r.knowledgePointId,
    knowledgePointName: (
      db.prepare('SELECT name FROM knowledge_points WHERE id = ?').get(r.knowledgePointId) as { name: string }
    ).name,
    masteryProbability: r.probability,
  }));

  const overallMastery = Math.round(
    (knowledges.reduce((s, k) => s + k.masteryProbability, 0) / knowledges.length) * 1000
  ) / 1000;

  const weakOnes = knowledges.filter((k) => k.masteryProbability < 0.5).map((k) => k.knowledgePointName);

  const result: DiagnosisResult = {
    studentId,
    studentName: student.name,
    overallMastery,
    knowledges,
    suggestedNextSteps: weakOnes.length > 0 ? weakOnes.slice(0, 3) : [knowledges[0].knowledgePointName],
  };

  res.json(result);
});

/** POST /api/diagnosis/suggest */
app.post('/api/diagnosis/suggest', async (req, res) => {
  const { diagnosisResult } = req.body as { diagnosisResult: DiagnosisResult };
  if (!diagnosisResult) {
    res.status(400).json({ error: 'Missing diagnosisResult' });
    return;
  }
  const suggestion = await generateSuggestion(diagnosisResult);
  res.json({ suggestion });
});

export default app;

/** 启动服务器（生产/开发入口） */
export function startServer(port = 3000) {
  app.listen(port, () => {
    console.log(`Cognitive Diagnosis API running on http://localhost:${port}`);
  });
}
