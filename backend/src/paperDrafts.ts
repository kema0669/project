import Database from 'better-sqlite3';

export interface PaperDraftQuestionInput {
  questionNo: number;
  title: string;
  maxScore: number;
  questionType?: string;
}

export interface CreatePaperDraftInput {
  examId: number;
  gradeId: number;
  subjectId: number;
  sourceName: string;
  questions: PaperDraftQuestionInput[];
}

export interface DraftKnowledgeCandidate {
  id: number;
  knowledgePointId: number;
  knowledgePointName: string;
  confidence: number;
  reason: string;
  teacherApproved: boolean;
}

export interface PaperQuestionDraft {
  id: number;
  questionNo: number;
  title: string;
  questionType: string;
  maxScore: number;
  aiConfidence: number;
  teacherApproved: boolean;
  candidates: DraftKnowledgeCandidate[];
}

export interface PaperParseDraft {
  id: number;
  examId: number;
  gradeId: number;
  subjectId: number;
  sourceName: string;
  status: 'needs_review' | 'confirmed';
  reviewerNote?: string;
  questions: PaperQuestionDraft[];
}

function candidateKnowledgePoints(db: Database.Database, subjectId: number, questionNo: number) {
  // 当前阶段不调用真实大模型，用规则引擎模拟“AI 推荐考点”。
  // 后续接入 LLM 时，只需要替换这里的候选生成逻辑，草稿/确认流程保持不变。
  const rows = db
    .prepare('SELECT id, name FROM knowledge_points WHERE subject_id = ? ORDER BY level, id')
    .all(subjectId) as { id: number; name: string }[];
  if (rows.length === 0) return [];

  const primary = rows[(questionNo - 1) % rows.length];
  const secondary = rows[questionNo % rows.length];
  return [
    { ...primary, confidence: 0.78, reason: '规则引擎根据题号与学科考点结构生成的首选候选' },
    { ...secondary, confidence: 0.52, reason: '规则引擎提供的备选考点，需老师确认' },
  ].filter((item, index, arr) => arr.findIndex((other) => other.id === item.id) === index);
}

export function getPaperDraft(db: Database.Database, draftId: number): PaperParseDraft | undefined {
  const draft = db
    .prepare(`
      SELECT id,
             exam_id AS examId,
             grade_id AS gradeId,
             subject_id AS subjectId,
             source_name AS sourceName,
             status,
             reviewer_note AS reviewerNote
      FROM paper_parse_drafts
      WHERE id = ?
    `)
    .get(draftId) as Omit<PaperParseDraft, 'questions'> | undefined;
  if (!draft) return undefined;

  const questions = db
    .prepare(`
      SELECT id,
             question_no AS questionNo,
             title,
             question_type AS questionType,
             max_score AS maxScore,
             ai_confidence AS aiConfidence,
             teacher_approved AS teacherApproved
      FROM paper_question_drafts
      WHERE draft_id = ?
      ORDER BY question_no
    `)
    .all(draftId) as Omit<PaperQuestionDraft, 'candidates'>[];

  const candidatesStmt = db.prepare(`
    SELECT dkc.id,
           dkc.knowledge_point_id AS knowledgePointId,
           kp.name AS knowledgePointName,
           dkc.confidence,
           dkc.reason,
           dkc.teacher_approved AS teacherApproved
    FROM draft_knowledge_candidates dkc
    JOIN knowledge_points kp ON kp.id = dkc.knowledge_point_id
    WHERE dkc.question_draft_id = ?
    ORDER BY dkc.confidence DESC, dkc.id
  `);

  return {
    ...draft,
    status: draft.status as 'needs_review' | 'confirmed',
    questions: questions.map((question) => ({
      ...question,
      teacherApproved: Boolean(question.teacherApproved),
      candidates: (candidatesStmt.all(question.id) as (Omit<DraftKnowledgeCandidate, 'teacherApproved'> & {
        teacherApproved: number;
      })[]).map((candidate) => ({
        ...candidate,
        teacherApproved: Boolean(candidate.teacherApproved),
      })),
    })),
  };
}

export function createPaperDraft(db: Database.Database, input: CreatePaperDraftInput): PaperParseDraft {
  if (!input.sourceName?.trim()) throw new Error('sourceName is required');
  if (!input.questions?.length) throw new Error('questions are required');

  const trx = db.transaction(() => {
    const draft = db
      .prepare(`
        INSERT INTO paper_parse_drafts (exam_id, grade_id, subject_id, source_name, status)
        VALUES (?, ?, ?, ?, 'needs_review')
        RETURNING id
      `)
      .get(input.examId, input.gradeId, input.subjectId, input.sourceName.trim()) as { id: number };

    const insertQuestion = db.prepare(`
      INSERT INTO paper_question_drafts
        (draft_id, question_no, title, question_type, max_score, ai_confidence, teacher_approved)
      VALUES (?, ?, ?, ?, ?, ?, 0)
      RETURNING id
    `);
    const insertCandidate = db.prepare(`
      INSERT INTO draft_knowledge_candidates
        (question_draft_id, knowledge_point_id, confidence, reason, teacher_approved)
      VALUES (?, ?, ?, ?, 0)
    `);

    for (const question of input.questions) {
      const inserted = insertQuestion.get(
        draft.id,
        question.questionNo,
        question.title,
        question.questionType ?? 'subjective',
        question.maxScore,
        0.68
      ) as { id: number };

      for (const candidate of candidateKnowledgePoints(db, input.subjectId, question.questionNo)) {
        insertCandidate.run(inserted.id, candidate.id, candidate.confidence, candidate.reason);
      }
    }

    return draft.id;
  });

  const draftId = trx();
  const draft = getPaperDraft(db, draftId);
  if (!draft) throw new Error('Failed to create paper draft');
  return draft;
}

export function confirmPaperDraft(db: Database.Database, draftId: number, reviewerNote = ''): PaperParseDraft {
  // 确认草稿只改变草稿状态，不直接写入正式 paper_questions。
  // 这样可以避免 AI 推荐错误污染正式考试数据。
  const result = db
    .prepare(`
      UPDATE paper_parse_drafts
      SET status = 'confirmed',
          confirmed_at = CURRENT_TIMESTAMP,
          reviewer_note = ?
      WHERE id = ?
    `)
    .run(reviewerNote, draftId);
  if (result.changes === 0) throw new Error('Draft not found');

  const draft = getPaperDraft(db, draftId);
  if (!draft) throw new Error('Draft not found');
  return draft;
}
