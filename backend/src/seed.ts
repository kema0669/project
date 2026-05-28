import Database from 'better-sqlite3';

const grades = [
  [1, 'G7', '初一', 'junior'],
  [2, 'G8', '初二', 'junior'],
  [3, 'G9', '初三', 'junior'],
] as const;

const subjects = [
  [1, 'chinese', '语文', 1],
  [2, 'math', '数学', 2],
  [3, 'english', '英语', 3],
  [4, 'physics', '物理', 4],
  [5, 'chemistry', '化学', 5],
  [6, 'biology', '生物', 6],
  [7, 'politics', '政治', 7],
  [8, 'history', '历史', 8],
  [9, 'geography', '地理', 9],
] as const;

const gradeSubjectIds: Record<number, number[]> = {
  1: [1, 2, 3, 6, 7, 8, 9],
  2: [1, 2, 3, 4, 6, 7, 8, 9],
  3: [1, 2, 3, 4, 5, 7, 8],
};

const students = [
  [1, 'G7-001', '张三', 1, '七年级1班'],
  [2, 'G7-002', '李四', 1, '七年级1班'],
  [3, 'G7-003', '王五', 1, '七年级2班'],
  [4, 'G8-001', '赵六', 2, '八年级1班'],
  [5, 'G8-002', '孙七', 2, '八年级1班'],
  [6, 'G8-003', '周八', 2, '八年级2班'],
  [7, 'G9-001', '吴九', 3, '九年级1班'],
  [8, 'G9-002', '郑十', 3, '九年级1班'],
  [9, 'G9-003', '钱十一', 3, '九年级2班'],
] as const;

const exams = [
  [1, '第一次月考', '2026-03-20', '2026 春季'],
  [2, '期中考试', '2026-04-25', '2026 春季'],
  [3, '第二次月考', '2026-05-20', '2026 春季'],
] as const;

const knowledgeTemplates: Record<number, string[]> = {
  1: ['基础积累', '阅读理解', '写作表达'],
  2: ['数与式', '方程应用', '几何图形'],
  3: ['词汇语法', '阅读理解', '书面表达'],
  4: ['运动与力', '声光热', '实验探究'],
  5: ['物质构成', '化学方程式', '实验探究'],
  6: ['细胞与生物体', '生态系统', '遗传与进化'],
  7: ['道德法治', '国情理解', '材料分析'],
  8: ['中国史', '世界史', '史料分析'],
  9: ['地图与地球', '自然地理', '人文地理'],
};

function subjectTotal(subjectId: number): number {
  if ([1, 2, 3].includes(subjectId)) return 120;
  if ([4, 5].includes(subjectId)) return 100;
  return 80;
}

function paperQuestionScores(total: number): number[] {
  if (total === 120) return [20, 20, 25, 25, 30];
  if (total === 100) return [15, 20, 20, 20, 25];
  return [10, 15, 15, 20, 20];
}

function scoreRate(studentId: number, examId: number, subjectId: number, questionNo: number): number {
  const base = 0.56 + ((studentId * 13 + subjectId * 7 + questionNo * 5) % 28) / 100;
  const examGrowth = (examId - 1) * 0.035;
  const subjectBias = [1, 2, 3].includes(subjectId) ? 0.03 : 0;
  const challenge = questionNo >= 4 ? -0.04 : 0;
  return Math.max(0.35, Math.min(0.98, base + examGrowth + subjectBias + challenge));
}

function recomputeRanks(db: Database.Database): void {
  const rows = db.prepare(`
    SELECT ss.id,
           ss.exam_id AS examId,
           ss.student_id AS studentId,
           ss.subject_id AS subjectId,
           ss.score,
           s.grade_id AS gradeId,
           s.class_name AS className
    FROM student_scores ss
    JOIN students s ON s.id = ss.student_id
  `).all() as {
    id: number;
    examId: number;
    studentId: number;
    subjectId: number;
    score: number;
    gradeId: number;
    className: string;
  }[];

  const update = db.prepare('UPDATE student_scores SET class_rank = ?, grade_rank = ? WHERE id = ?');

  for (const row of rows) {
    const classRank =
      rows.filter(
        (r) =>
          r.examId === row.examId &&
          r.subjectId === row.subjectId &&
          r.className === row.className &&
          r.score > row.score
      ).length + 1;
    const gradeRank =
      rows.filter(
        (r) =>
          r.examId === row.examId &&
          r.subjectId === row.subjectId &&
          r.gradeId === row.gradeId &&
          r.score > row.score
      ).length + 1;
    update.run(classRank, gradeRank, row.id);
  }
}

function seedMvpData(db: Database.Database): void {
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, password_hash, role, status, display_name)
    VALUES (?, ?, ?, ?, 'approved', ?)
    ON CONFLICT(username) DO UPDATE SET
      password_hash = excluded.password_hash,
      role = excluded.role,
      status = excluded.status,
      display_name = excluded.display_name
  `);
  const insertClass = db.prepare(`
    INSERT INTO classes (id, name, teacher_user_id)
    VALUES (1, 'Class A', 1)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      teacher_user_id = excluded.teacher_user_id
  `);
  const updateStudent = db.prepare(`
    UPDATE students
    SET user_id = ?, class_id = 1, student_no = ?, class_name = 'Class A'
    WHERE id = ?
  `);
  const insertMvpKnowledge = db.prepare(`
    INSERT INTO knowledge_points (id, subject_id, code, name, description, level, sort_order)
    VALUES (?, 2, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      code = excluded.code,
      name = excluded.name,
      description = excluded.description,
      level = excluded.level,
      sort_order = excluded.sort_order
  `);
  const insertRelation = db.prepare(`
    INSERT OR IGNORE INTO knowledge_relations (from_knowledge_point_id, to_knowledge_point_id, relation_type)
    VALUES (?, ?, 'prerequisite')
  `);
  const insertExam = db.prepare(`
    INSERT INTO exams (id, class_id, name, question_count, created_by_user_id)
    VALUES (1, 1, 'DINA Diagnostic Quiz', 20, 1)
    ON CONFLICT(id) DO UPDATE SET
      class_id = excluded.class_id,
      name = excluded.name,
      question_count = excluded.question_count,
      created_by_user_id = excluded.created_by_user_id
  `);
  const insertQuestion = db.prepare(`
    INSERT INTO questions (id, exam_id, question_no, content, difficulty)
    VALUES (?, 1, ?, ?, ?)
    ON CONFLICT(exam_id, question_no) DO UPDATE SET
      content = excluded.content,
      difficulty = excluded.difficulty
  `);
  const insertQMatrix = db.prepare(`
    INSERT OR IGNORE INTO q_matrix (question_id, knowledge_point_id, weight)
    VALUES (?, ?, 1)
  `);

  insertUser.run(1, 'teacher01', 'password123', 'teacher', 'Teacher Demo');
  for (let i = 1; i <= 10; i++) {
    insertUser.run(100 + i, `stu${String(i).padStart(3, '0')}`, 'password123', 'student', `Student ${i}`);
  }
  insertClass.run();

  const studentRows = db.prepare('SELECT id FROM students ORDER BY id LIMIT 10').all() as { id: number }[];
  studentRows.forEach((student, index) => {
    updateStudent.run(101 + index, `S${String(index + 1).padStart(3, '0')}`, student.id);
  });

  const knowledgeRows = [
    [1, 'kp_number', 'Number Sense', 'Basic number concepts', 1, 1],
    [2, 'kp_fraction', 'Fractions', 'Fraction operations', 1, 2],
    [3, 'kp_equation', 'Equation Basics', 'Linear equation basics', 2, 3],
    [4, 'kp_geometry', 'Geometry', 'Basic geometry reasoning', 2, 4],
    [5, 'kp_application', 'Applications', 'Word problems and applications', 3, 5],
  ] as const;
  for (const row of knowledgeRows) insertMvpKnowledge.run(...row);
  for (let i = 1; i < 5; i++) insertRelation.run(i, i + 1);

  insertExam.run();
  for (let i = 1; i <= 20; i++) {
    insertQuestion.run(i, i, `Question ${i}`, 0.35 + (i % 5) * 0.1);
    insertQMatrix.run(i, ((i - 1) % 5) + 1);
    if (i % 4 === 0) insertQMatrix.run(i, 5);
  }
}

export function seedData(db: Database.Database): void {
  const trx = db.transaction(() => {
    const insertGrade = db.prepare('INSERT OR IGNORE INTO grades (id, code, name, stage) VALUES (?, ?, ?, ?)');
    const insertSubject = db.prepare(
      'INSERT OR IGNORE INTO subjects (id, code, name, display_order) VALUES (?, ?, ?, ?)'
    );
    const insertGradeSubject = db.prepare(
      'INSERT OR IGNORE INTO grade_subjects (grade_id, subject_id, is_required) VALUES (?, ?, 1)'
    );
    const insertStudent = db.prepare(`
      INSERT INTO students (id, external_id, name, grade_id, class_name, status, joined_at)
      VALUES (?, ?, ?, ?, ?, 'active', date('now'))
      ON CONFLICT(id) DO UPDATE SET
        external_id = excluded.external_id,
        name = excluded.name,
        grade_id = excluded.grade_id,
        class_name = excluded.class_name,
        status = 'active'
    `);
    const insertExam = db.prepare(
      'INSERT OR IGNORE INTO exam_batches (id, name, exam_date, term) VALUES (?, ?, ?, ?)'
    );
    const insertPaper = db.prepare(`
      INSERT OR IGNORE INTO papers (id, exam_id, grade_id, subject_id, name, total_score)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertQuestion = db.prepare(`
      INSERT OR IGNORE INTO paper_questions (id, paper_id, question_no, title, question_type, max_score, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertKnowledge = db.prepare(`
      INSERT OR IGNORE INTO knowledge_points (id, subject_id, code, name, description, level)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertQuestionKnowledge = db.prepare(`
      INSERT OR IGNORE INTO question_knowledge_map (paper_question_id, knowledge_point_id, weight)
      VALUES (?, ?, ?)
    `);
    const insertStudentScore = db.prepare(`
      INSERT INTO student_scores (exam_id, student_id, subject_id, paper_id, score)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(exam_id, student_id, subject_id) DO UPDATE SET
        paper_id = excluded.paper_id,
        score = excluded.score
    `);
    const insertQuestionScore = db.prepare(`
      INSERT INTO question_scores (exam_id, student_id, paper_question_id, score)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(exam_id, student_id, paper_question_id) DO UPDATE SET
        score = excluded.score
    `);

    for (const grade of grades) insertGrade.run(...grade);
    for (const subject of subjects) insertSubject.run(...subject);
    for (const [gradeId, subjectIds] of Object.entries(gradeSubjectIds)) {
      for (const subjectId of subjectIds) insertGradeSubject.run(Number(gradeId), subjectId);
    }
    for (const student of students) insertStudent.run(...student);
    for (const exam of exams) insertExam.run(...exam);

    let paperId = 1;
    let questionId = 1;
    let knowledgeId = 1;
    const paperByKey = new Map<string, number>();
    const questionsByPaper = new Map<number, { id: number; maxScore: number; questionNo: number }[]>();
    const knowledgeBySubject = new Map<number, number[]>();

    for (const subject of subjects) {
      const subjectId = subject[0];
      const pointIds: number[] = [];
      knowledgeTemplates[subjectId].forEach((name, index) => {
        const id = knowledgeId++;
        pointIds.push(id);
        insertKnowledge.run(id, subjectId, `${subject[1]}_${index + 1}`, name, `${subject[2]}核心考点`, index + 1);
      });
      knowledgeBySubject.set(subjectId, pointIds);
    }

    for (const exam of exams) {
      for (const grade of grades) {
        const gradeId = grade[0];
        for (const subjectId of gradeSubjectIds[gradeId]) {
          const total = subjectTotal(subjectId);
          const currentPaperId = paperId++;
          const subjectName = subjects.find((s) => s[0] === subjectId)?.[2] ?? '学科';
          insertPaper.run(
            currentPaperId,
            exam[0],
            gradeId,
            subjectId,
            `${grade[2]}${subjectName}${exam[1]}试卷`,
            total
          );
          paperByKey.set(`${exam[0]}-${gradeId}-${subjectId}`, currentPaperId);

          const qScores = paperQuestionScores(total);
          const questionRows: { id: number; maxScore: number; questionNo: number }[] = [];
          qScores.forEach((maxScore, index) => {
            const currentQuestionId = questionId++;
            const questionNo = index + 1;
            insertQuestion.run(
              currentQuestionId,
              currentPaperId,
              questionNo,
              `${subjectName}第${questionNo}题`,
              questionNo >= 4 ? 'application' : 'basic',
              maxScore,
              questionNo
            );
            const kpIds = knowledgeBySubject.get(subjectId) ?? [];
            insertQuestionKnowledge.run(currentQuestionId, kpIds[index % kpIds.length], 1);
            if (questionNo >= 4) insertQuestionKnowledge.run(currentQuestionId, kpIds[(index + 1) % kpIds.length], 0.6);
            questionRows.push({ id: currentQuestionId, maxScore, questionNo });
          });
          questionsByPaper.set(currentPaperId, questionRows);
        }
      }
    }

    for (const exam of exams) {
      for (const student of students) {
        const studentId = student[0];
        const gradeId = student[3];
        for (const subjectId of gradeSubjectIds[gradeId]) {
          const currentPaperId = paperByKey.get(`${exam[0]}-${gradeId}-${subjectId}`);
          if (!currentPaperId) continue;
          const questionRows = questionsByPaper.get(currentPaperId) ?? [];
          let totalScore = 0;
          for (const question of questionRows) {
            const raw = question.maxScore * scoreRate(studentId, exam[0], subjectId, question.questionNo);
            const score = Math.round(raw * 10) / 10;
            totalScore += score;
            insertQuestionScore.run(exam[0], studentId, question.id, score);
          }
          insertStudentScore.run(exam[0], studentId, subjectId, currentPaperId, Math.round(totalScore * 10) / 10);
        }
      }
    }

    recomputeRanks(db);
    seedMvpData(db);
  });

  trx();
}
