import Database from 'better-sqlite3';

export function seedData(db: Database.Database): void {
  const insertKP = db.prepare(
    'INSERT INTO knowledge_points (id, code, name, description, level) VALUES (?, ?, ?, ?, ?)'
  );
  const insertRel = db.prepare(
    'INSERT INTO knowledge_relations (id, from_id, to_id, relation_type) VALUES (?, ?, ?, ?)'
  );
  const insertQ = db.prepare(
    'INSERT INTO questions (id, content, type, difficulty) VALUES (?, ?, ?, ?)'
  );
  const insertQKM = db.prepare(
    'INSERT INTO question_knowledge_map (id, question_id, knowledge_point_id, weight) VALUES (?, ?, ?, ?)'
  );
  const insertStudent = db.prepare(
    'INSERT INTO students (id, name) VALUES (?, ?)'
  );
  const insertResponse = db.prepare(
    'INSERT INTO responses (student_id, question_id, is_correct, response_time) VALUES (?, ?, ?, ?)'
  );

  // 1. Knowledge Points
  const kps = [
    [1, 'addition_basic', '加法基础', '掌握10以内及20以内的加法运算规则', 1],
    [2, 'subtraction_basic', '减法基础', '掌握10以内及20以内的减法运算规则', 1],
    [3, 'mixed_add_sub', '加减混合运算', '能够综合运用加法与减法解决多步问题', 2],
    [4, 'multiplication_basic', '乘法基础', '掌握乘法口诀表及基本乘法运算', 1],
    [5, 'mixed_mul_div', '乘除混合运算', '能够综合运用乘法与除法解决多步问题', 2],
  ];
  for (const kp of kps) insertKP.run(...kp);

  // 2. Knowledge Relations
  const rels = [
    [1, 1, 3, 'prerequisite'],
    [2, 2, 3, 'prerequisite'],
    [3, 4, 5, 'prerequisite'],
  ];
  for (const rel of rels) insertRel.run(...rel);

  // 3. Questions (20)
  const questions: [number, string, string, number][] = [];
  for (let i = 1; i <= 20; i++) {
    let content = '';
    let diff = 0.5;
    if (i <= 4) { content = `加法基础练习题 ${i}`; diff = 0.3 + (i - 1) * 0.05; }
    else if (i <= 8) { content = `减法基础练习题 ${i - 4}`; diff = 0.35 + (i - 5) * 0.05; }
    else if (i <= 12) { content = `加减混合练习题 ${i - 8}`; diff = 0.6 + (i - 9) * 0.07; }
    else if (i <= 16) { content = `乘法基础练习题 ${i - 12}`; diff = 0.4 + (i - 13) * 0.05; }
    else { content = `乘除混合练习题 ${i - 16}`; diff = 0.7 + (i - 17) * 0.07; }
    questions.push([i, content, 'single_choice', Number(diff.toFixed(2))]);
  }
  for (const q of questions) insertQ.run(...q);

  // 4. Q Matrix (question_knowledge_map)
  // Q1-4 -> KP1, Q5-8 -> KP2, Q9-12 -> KP1+KP2+KP3, Q13-16 -> KP4, Q17-20 -> KP4+KP5
  let qkmId = 1;
  const qkmEntries: [number, number, number, number][] = [];
  for (let q = 1; q <= 20; q++) {
    if (q <= 4) qkmEntries.push([qkmId++, q, 1, 1]);
    else if (q <= 8) qkmEntries.push([qkmId++, q, 2, 1]);
    else if (q <= 12) {
      qkmEntries.push([qkmId++, q, 1, 1]);
      qkmEntries.push([qkmId++, q, 2, 1]);
      qkmEntries.push([qkmId++, q, 3, 1]);
    } else if (q <= 16) qkmEntries.push([qkmId++, q, 4, 1]);
    else {
      qkmEntries.push([qkmId++, q, 4, 1]);
      qkmEntries.push([qkmId++, q, 5, 1]);
    }
  }
  for (const e of qkmEntries) insertQKM.run(...e);

  // 5. Students
  const students = [
    [1, '张三'],
    [2, '李四'],
    [3, '王五'],
    [4, '赵六'],
    [5, '孙七'],
    [6, '周八'],
    [7, '吴九'],
    [8, '郑十'],
    [9, '钱十一'],
    [10, '陈十二'],
  ];
  for (const s of students) insertStudent.run(...s);

  // 6. Responses (X Matrix) — deterministic by design for reproducibility
  const profiles: Record<number, (q: number) => number> = {
    // 1. 张三 — 学霸型，整体 ~90%
    1: (q) => {
      if (q <= 12) return q === 12 ? 0 : 1; // 加减错1道
      if (q <= 16) return 1; // 乘法全对
      return q === 20 ? 0 : 1; // 乘除混合错1道
    },
    // 2. 李四 — 偏科型，加减强 ~83%，乘除弱 ~25%
    2: (q) => {
      if (q <= 12) return [3, 7].includes(q) ? 0 : 1; // 加减错2道
      if (q <= 16) return q % 2 === 0 ? 1 : 0; // 乘法错2道
      return q === 18 ? 1 : 0; // 乘除混合只错1道
    },
    // 3. 王五 — 薄弱型，整体 ~35%
    3: (q) => {
      if (q <= 4) return q <= 2 ? 1 : 0;
      if (q <= 8) return q === 5 ? 1 : 0;
      if (q <= 12) return 0;
      if (q <= 16) return q <= 14 ? 1 : 0;
      return q === 17 ? 1 : 0;
    },
    // 4. 赵六 — 中等偏上 ~70%
    4: (q) => {
      if (q <= 8) return q % 3 === 0 ? 0 : 1;
      if (q <= 12) return q <= 10 ? 1 : 0;
      if (q <= 16) return q % 2 === 0 ? 1 : 0;
      return q === 18 ? 1 : 0;
    },
    // 5. 孙七 — 中等 ~55%
    5: (q) => {
      if (q <= 8) return q % 2 === 0 ? 1 : 0;
      if (q <= 12) return q === 9 ? 1 : 0;
      if (q <= 16) return q <= 14 ? 1 : 0;
      return q === 19 ? 1 : 0;
    },
    // 6. 周八 — 中等偏下 ~45%
    6: (q) => {
      if (q <= 8) return q <= 3 ? 1 : 0;
      if (q <= 12) return q === 10 ? 1 : 0;
      if (q <= 16) return q <= 14 ? 1 : 0;
      return q === 17 ? 1 : 0;
    },
    // 7. 吴九 — 良好 ~75%
    7: (q) => {
      if (q <= 8) return q === 4 ? 0 : 1;
      if (q <= 12) return q <= 11 ? 1 : 0;
      if (q <= 16) return q === 15 ? 0 : 1;
      return q === 20 ? 0 : 1;
    },
    // 8. 郑十 — 乘除偏强 ~60%
    8: (q) => {
      if (q <= 8) return q <= 4 ? 1 : 0;
      if (q <= 12) return q === 9 ? 1 : 0;
      if (q <= 16) return q <= 15 ? 1 : 0;
      return q <= 19 ? 1 : 0;
    },
    // 9. 钱十一 — 随机 ~50%
    9: (q) => (q % 2 === 0 ? 1 : 0),
    // 10. 陈十二 — 优秀 ~85%
    10: (q) => {
      if (q <= 8) return q === 6 ? 0 : 1;
      if (q <= 12) return q === 11 ? 0 : 1;
      if (q <= 16) return 1;
      return q === 19 ? 0 : 1;
    },
  };

  for (const studentId of Object.keys(profiles).map(Number)) {
    for (let q = 1; q <= 20; q++) {
      const isCorrect = profiles[studentId](q);
      const responseTime = 5000 + Math.floor(Math.random() * 15000);
      insertResponse.run(studentId, q, isCorrect, responseTime);
    }
  }
}
