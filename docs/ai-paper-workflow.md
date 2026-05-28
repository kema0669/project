# 阶段五：AI 辅助试卷解析流程

本阶段只实现“AI/规则生成草稿 -> 老师确认”的扩展点，不做 OCR、不调用真实大模型、不自动覆盖正式试卷。

## 目标

老师上传或录入试卷后，系统生成一份待确认草稿：

1. 拆分题目
2. 识别题型
3. 推荐每题考点
4. 推荐每题满分
5. 老师确认或修改
6. 确认后再进入正式入库流程

## 当前实现边界

当前版本使用规则引擎模拟 AI 推荐：

- 输入结构化题目列表
- 根据科目和题号推荐候选考点
- 候选考点写入草稿表
- 老师确认时只改变草稿状态
- 不自动修改 `papers`、`paper_questions`、`question_knowledge_map`

这样可以避免 AI 误判直接污染正式考试数据。

## 草稿数据表

```text
paper_parse_drafts
paper_question_drafts
draft_knowledge_candidates
```

这些表和正式试卷表隔离：

```text
正式表：papers / paper_questions / question_knowledge_map
草稿表：paper_parse_drafts / paper_question_drafts / draft_knowledge_candidates
```

## API

### 创建试卷解析草稿

```http
POST /api/paper-drafts
```

示例请求：

```json
{
  "examId": 3,
  "gradeId": 2,
  "subjectId": 4,
  "sourceName": "八年级物理试卷.docx",
  "questions": [
    {
      "questionNo": 1,
      "title": "分析小车运动状态",
      "maxScore": 10,
      "questionType": "application"
    }
  ]
}
```

### 查看草稿

```http
GET /api/paper-drafts/:draftId
```

### 确认草稿

```http
POST /api/paper-drafts/:draftId/confirm
```

示例请求：

```json
{
  "reviewerNote": "老师已确认候选考点，等待正式入库策略"
}
```

## 后续接入真实 AI 的位置

未来可以替换 `backend/src/paperDrafts.ts` 中的候选生成逻辑：

```text
candidateKnowledgePoints()
```

替换方向：

1. 文本试卷：用 LLM 拆题和推荐考点
2. Word/PDF：先提取文本，再交给 LLM
3. 扫描件：先 OCR，再走文本流程

## 风险控制

AI 推荐考点不能直接入库，必须经过老师确认。

主要原因：

- 一道题可能对应多个考点
- 不同学科题型差异大
- 上传文件格式不稳定
- AI 对考点体系可能误判
- 正式成绩分析依赖题目-考点映射准确性

因此当前设计采用“双区隔离”：

```text
AI 草稿区 -> 老师确认 -> 正式试卷区
```

正式入库可以作为下一阶段继续扩展。
