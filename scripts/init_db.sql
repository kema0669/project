-- SDD 阶段：数据库初始化脚本
-- 包含 Schema 定义 + 测试数据（5知识点 × 20题 × 10学生）

-- ==========================================
-- 1. 创建表结构
-- ==========================================

CREATE TABLE IF NOT EXISTS knowledge_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS knowledge_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id INTEGER NOT NULL,
    to_id INTEGER NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'prerequisite',
    FOREIGN KEY (from_id) REFERENCES knowledge_points(id),
    FOREIGN KEY (to_id) REFERENCES knowledge_points(id),
    UNIQUE(from_id, to_id)
);

CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'single_choice',
    difficulty REAL NOT NULL DEFAULT 0.5
);

CREATE TABLE IF NOT EXISTS question_knowledge_map (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    knowledge_point_id INTEGER NOT NULL,
    weight INTEGER NOT NULL DEFAULT 1 CHECK (weight IN (0, 1)),
    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id),
    UNIQUE(question_id, knowledge_point_id)
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
    response_time INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (question_id) REFERENCES questions(id),
    UNIQUE(student_id, question_id)
);

-- ==========================================
-- 2. 插入知识点（5个）
-- ==========================================

INSERT INTO knowledge_points (code, name, description, level) VALUES
('addition_basic', '加法基础', '掌握10以内及20以内的加法运算规则', 1),
('subtraction_basic', '减法基础', '掌握10以内及20以内的减法运算规则', 1),
('mixed_add_sub', '加减混合运算', '能够综合运用加法与减法解决多步问题', 2),
('multiplication_basic', '乘法基础', '掌握乘法口诀表及基本乘法运算', 1),
('mixed_mul_div', '乘除混合运算', '能够综合运用乘法与除法解决多步问题', 2);

-- ==========================================
-- 3. 插入知识图谱关系（前序/后继）
-- ==========================================

INSERT INTO knowledge_relations (from_id, to_id, relation_type) VALUES
(1, 3, 'prerequisite'),  -- 加法基础 -> 加减混合
(2, 3, 'prerequisite'),  -- 减法基础 -> 加减混合
(4, 5, 'prerequisite');  -- 乘法基础 -> 乘除混合

-- ==========================================
-- 4. 插入题目（20道）
-- ==========================================

INSERT INTO questions (content, type, difficulty) VALUES
('3 + 5 = ?', 'single_choice', 0.2),
('7 + 8 = ?', 'single_choice', 0.3),
('12 + 9 = ?', 'single_choice', 0.4),
('15 + 6 - 4 = ?', 'single_choice', 0.5),
('9 - 4 = ?', 'single_choice', 0.2),
('13 - 7 = ?', 'single_choice', 0.3),
('20 - 12 = ?', 'single_choice', 0.4),
('18 - 9 = ?', 'single_choice', 0.3),
('5 + 7 - 3 = ?', 'single_choice', 0.5),
('14 - 6 + 5 = ?', 'single_choice', 0.6),
('8 + 9 - 7 + 2 = ?', 'single_choice', 0.7),
('20 - 8 + 3 - 5 = ?', 'single_choice', 0.7),
('3 × 4 = ?', 'single_choice', 0.3),
('6 × 7 = ?', 'single_choice', 0.4),
('8 × 9 = ?', 'single_choice', 0.5),
('7 × 6 = ?', 'single_choice', 0.4),
('12 ÷ 3 = ?', 'single_choice', 0.4),
('24 ÷ 6 = ?', 'single_choice', 0.5),
('36 ÷ 4 = ?', 'single_choice', 0.6),
('3 × 5 + 12 ÷ 4 = ?', 'single_choice', 0.8);

-- ==========================================
-- 5. 插入 Q矩阵（题目 × 知识点关联）
-- ==========================================
-- 格式：每行表示"该题是否考察该知识点"（0或1）
-- 知识点顺序：1加法基础, 2减法基础, 3加减混合, 4乘法基础, 5乘除混合

INSERT INTO question_knowledge_map (question_id, knowledge_point_id, weight) VALUES
-- Q1-Q3：纯加法基础
(1, 1, 1), (2, 1, 1), (3, 1, 1),
-- Q4：加法+减法综合
(4, 1, 1), (4, 2, 1),
-- Q5-Q8：纯减法基础
(5, 2, 1), (6, 2, 1), (7, 2, 1), (8, 2, 1),
-- Q9-Q12：加减混合
(9, 3, 1), (10, 3, 1), (11, 3, 1), (12, 3, 1),
-- Q13-Q16：纯乘法基础
(13, 4, 1), (14, 4, 1), (15, 4, 1), (16, 4, 1),
-- Q17-Q19：乘除混合
(17, 5, 1), (18, 5, 1), (19, 5, 1),
-- Q20：综合运算（加减混合 + 乘除混合）
(20, 3, 1), (20, 5, 1);

-- ==========================================
-- 6. 插入学生（10名）
-- ==========================================

INSERT INTO students (name) VALUES
('张三'), ('李四'), ('王五'), ('赵六'), ('孙七'),
('周八'), ('吴九'), ('郑十'), ('钱十一'), ('陈十二');

-- ==========================================
-- 7. 插入作答记录（X矩阵）
-- ==========================================
-- 数据设计原则：不同学生有不同的知识点掌握模式，体现诊断价值
-- 作答模式说明（latent states，用于验证算法）：
-- S1: [1,1,1,1,1] 全掌握
-- S2: [1,1,1,0,0] 掌握前3个
-- S3: [1,0,0,0,0] 只掌握加法
-- S4: [0,1,0,0,0] 只掌握减法
-- S5: [1,1,0,0,0] 掌握加减基础
-- S6: [0,0,0,1,1] 掌握乘除
-- S7: [1,1,1,1,0] 掌握加减+乘法
-- S8: [0,0,1,0,1] 掌握混合运算但不掌握基础（异常情况，测试算法鲁棒性）
-- S9: [1,0,1,0,1] 离散掌握
-- S10:[0,1,0,1,0] 离散掌握

INSERT INTO responses (student_id, question_id, is_correct, response_time) VALUES
-- 学生1（全掌握，偶发失误）
(1, 1, 1, 3000), (1, 2, 1, 3500), (1, 3, 1, 4000), (1, 4, 1, 5000),
(1, 5, 1, 3200), (1, 6, 1, 3800), (1, 7, 1, 4200), (1, 8, 1, 3600),
(1, 9, 1, 5500), (1, 10, 1, 6000), (1, 11, 1, 7000), (1, 12, 0, 8000),
(1, 13, 1, 4000), (1, 14, 1, 4500), (1, 15, 1, 5000), (1, 16, 1, 4200),
(1, 17, 1, 5500), (1, 18, 1, 6000), (1, 19, 1, 7000), (1, 20, 1, 9000),

-- 学生2（掌握前3个：加减及混合，不掌握乘除）
(2, 1, 1, 3500), (2, 2, 1, 4000), (2, 3, 1, 4500), (2, 4, 1, 5500),
(2, 5, 1, 3800), (2, 6, 1, 4200), (2, 7, 1, 4800), (2, 8, 1, 4000),
(2, 9, 1, 6000), (2, 10, 1, 6500), (2, 11, 0, 7500), (2, 12, 1, 7000),
(2, 13, 0, 5000), (2, 14, 1, 5500), (2, 15, 0, 6000), (2, 16, 0, 5200),
(2, 17, 0, 7000), (2, 18, 0, 7500), (2, 19, 0, 8000), (2, 20, 0, 9500),

-- 学生3（只掌握加法基础）
(3, 1, 1, 3000), (3, 2, 1, 3500), (3, 3, 1, 4000), (3, 4, 0, 5000),
(3, 5, 0, 3500), (3, 6, 0, 4000), (3, 7, 0, 4500), (3, 8, 0, 3800),
(3, 9, 0, 5500), (3, 10, 0, 6000), (3, 11, 0, 7000), (3, 12, 0, 6500),
(3, 13, 0, 4500), (3, 14, 0, 5000), (3, 15, 0, 5500), (3, 16, 0, 4800),
(3, 17, 0, 6000), (3, 18, 0, 6500), (3, 19, 0, 7000), (3, 20, 0, 9000),

-- 学生4（只掌握减法基础）
(4, 1, 0, 3500), (4, 2, 0, 4000), (4, 3, 0, 4500), (4, 4, 0, 5500),
(4, 5, 1, 3000), (4, 6, 1, 3500), (4, 7, 1, 4000), (4, 8, 1, 3200),
(4, 9, 0, 6000), (4, 10, 0, 6500), (4, 11, 0, 7500), (4, 12, 0, 7000),
(4, 13, 0, 5000), (4, 14, 0, 5500), (4, 15, 0, 6000), (4, 16, 0, 5200),
(4, 17, 0, 7000), (4, 18, 0, 7500), (4, 19, 0, 8000), (4, 20, 0, 9500),

-- 学生5（掌握加减基础，不掌握混合与乘除）
(5, 1, 1, 3000), (5, 2, 1, 3500), (5, 3, 1, 4000), (5, 4, 1, 5000),
(5, 5, 1, 3200), (5, 6, 1, 3800), (5, 7, 1, 4200), (5, 8, 1, 3600),
(5, 9, 0, 6000), (5, 10, 0, 6500), (5, 11, 0, 7000), (5, 12, 0, 7500),
(5, 13, 0, 4800), (5, 14, 0, 5200), (5, 15, 0, 5500), (5, 16, 0, 5000),
(5, 17, 0, 7000), (5, 18, 0, 7500), (5, 19, 0, 8000), (5, 20, 0, 9500),

-- 学生6（掌握乘除，不掌握加减）
(6, 1, 0, 3500), (6, 2, 0, 4000), (6, 3, 0, 4500), (6, 4, 0, 5500),
(6, 5, 0, 3800), (6, 6, 0, 4200), (6, 7, 0, 4800), (6, 8, 0, 4000),
(6, 9, 0, 6000), (6, 10, 0, 6500), (6, 11, 0, 7500), (6, 12, 0, 7000),
(6, 13, 1, 4000), (6, 14, 1, 4500), (6, 15, 1, 5000), (6, 16, 1, 4200),
(6, 17, 1, 5500), (6, 18, 1, 6000), (6, 19, 0, 7000), (6, 20, 0, 9000),

-- 学生7（掌握加减+乘法，不掌握乘除混合）
(7, 1, 1, 3000), (7, 2, 1, 3500), (7, 3, 1, 4000), (7, 4, 1, 5000),
(7, 5, 1, 3200), (7, 6, 1, 3800), (7, 7, 1, 4200), (7, 8, 1, 3600),
(7, 9, 1, 5500), (7, 10, 1, 6000), (7, 11, 0, 7000), (7, 12, 1, 6500),
(7, 13, 1, 4000), (7, 14, 1, 4500), (7, 15, 1, 5000), (7, 16, 1, 4200),
(7, 17, 0, 6000), (7, 18, 0, 6500), (7, 19, 0, 7000), (7, 20, 0, 9000),

-- 学生8（离散掌握：只掌握混合运算，不掌握基础——测试算法鲁棒性）
(8, 1, 0, 4000), (8, 2, 0, 4500), (8, 3, 1, 6000), (8, 4, 0, 5000),
(8, 5, 0, 4200), (8, 6, 0, 4800), (8, 7, 0, 5200), (8, 8, 0, 4500),
(8, 9, 1, 6500), (8, 10, 1, 7000), (8, 11, 0, 7500), (8, 12, 1, 7200),
(8, 13, 0, 5500), (8, 14, 0, 6000), (8, 15, 0, 6500), (8, 16, 0, 5800),
(8, 17, 1, 7000), (8, 18, 0, 7500), (8, 19, 1, 8000), (8, 20, 0, 9500),

-- 学生9（离散掌握：加法+加减混合+乘除混合）
(9, 1, 1, 3000), (9, 2, 0, 4000), (9, 3, 1, 5500), (9, 4, 0, 5000),
(9, 5, 0, 3800), (9, 6, 0, 4200), (9, 7, 0, 4800), (9, 8, 0, 4000),
(9, 9, 1, 6000), (9, 10, 1, 6500), (9, 11, 0, 7000), (9, 12, 1, 6800),
(9, 13, 0, 5000), (9, 14, 0, 5500), (9, 15, 0, 6000), (9, 16, 0, 5200),
(9, 17, 1, 6500), (9, 18, 1, 7000), (9, 19, 0, 7500), (9, 20, 0, 9000),

-- 学生10（离散掌握：减法+乘法）
(10, 1, 0, 3500), (10, 2, 0, 4000), (10, 3, 0, 4500), (10, 4, 0, 5500),
(10, 5, 1, 3000), (10, 6, 1, 3500), (10, 7, 0, 4200), (10, 8, 1, 3800),
(10, 9, 0, 6000), (10, 10, 0, 6500), (10, 11, 0, 7500), (10, 12, 0, 7000),
(10, 13, 1, 4200), (10, 14, 1, 4800), (10, 15, 0, 5500), (10, 16, 1, 4600),
(10, 17, 0, 6500), (10, 18, 0, 7000), (10, 19, 0, 7500), (10, 20, 0, 9000);

-- ==========================================
-- 8. 创建视图：便于算法层直接消费 Q矩阵 和 X矩阵
-- ==========================================

CREATE VIEW IF NOT EXISTS q_matrix AS
SELECT
    q.id AS question_id,
    kp.id AS knowledge_point_id,
    COALESCE(qkm.weight, 0) AS weight
FROM questions q
CROSS JOIN knowledge_points kp
LEFT JOIN question_knowledge_map qkm
    ON qkm.question_id = q.id AND qkm.knowledge_point_id = kp.id
ORDER BY q.id, kp.id;

CREATE VIEW IF NOT EXISTS x_matrix AS
SELECT
    s.id AS student_id,
    q.id AS question_id,
    COALESCE(r.is_correct, 0) AS is_correct
FROM students s
CROSS JOIN questions q
LEFT JOIN responses r
    ON r.student_id = s.id AND r.question_id = q.id
ORDER BY s.id, q.id;
