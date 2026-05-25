# 智能化认知诊断 MVP

基于 DINA 模型的个性化学习分析系统，实现从学生作答记录到知识点掌握概率画像的端到端诊断链路。

## 项目简介

在"AI+教育"领域，精准评估学生的知识掌握程度（认知诊断）是实现个性化推荐和智能体辅导的基础。本项目是一个轻量级 MVP，包含：

- **Q 矩阵**（知识点-题目关联矩阵）：定义每一道题目考察了哪些具体的知识点
- **X 矩阵**（学生-题目作答矩阵）：记录学生在测试中的真实表现（对/错）
- **核心目标**：利用项目反应理论（IRT）中的 DINA 模型，结合知识图谱逻辑，通过分析 Q/X 矩阵，产出学生的知识掌握概率画像

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 19 + TypeScript + Vite 6 | 组件化开发，类型安全 |
| 图表 | ECharts 5 | 雷达图 + 力导向知识图谱 |
| 样式 | CSS Modules | 避免命名冲突，无运行时开销 |
| 后端 | Node.js + Express 5 + TypeScript | 极简 REST API |
| 数据库 | SQLite (better-sqlite3) | 轻量级文件数据库 |
| 算法 | DINA 模型 + EM 算法 | 认知诊断核心参数估计 |
| 测试 | Vitest + supertest | 单元测试 + 集成测试 + E2E 测试 |

## 项目结构

```
.
├── README.md                 # 本文件
├── CLAUDE.md                 # 项目说明书（作业要求）
├── prompts.md                # 核心 Prompt 记录文档（5 阶段完整：Step 0~4）
├── docs/
│   ├── schema.md             # SDD 阶段：数据库 Schema、ER 图、API 契约
│   ├── ui-design.md          # DDD 阶段：UI/UX 设计文档
│   └── process.md            # 开发过程思路说明（业务转化、AI协同问题、效率思考）
├── frontend/                 # DDD + Stage4 产物
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── types.ts
│       ├── data/mock.ts      # API 客户端（Stage4 后调用真实接口）
│       └── components/       # Header、RadarChart、KnowledgeGraph 等
└── backend/                  # TDD + Stage4 产物
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── types.ts          # 共享类型契约
    │   ├── db.ts             # SQLite 建表
    │   ├── seed.ts           # 种子数据（5知识点 x 20题 x 10学生）
    │   ├── diagnosis.ts      # 数据库 -> DINA 算法整合层
    │   ├── server.ts         # Express REST API
    │   └── algorithm/
    │       └── dina.ts       # DINA 模型 EM 算法实现
    └── tests/
        ├── db.test.ts        # 数据库层测试（8例）
        ├── dina.test.ts      # 算法单元测试（5例）
        ├── integration.test.ts # 整合测试（5例）
        └── e2e.test.ts       # E2E 端到端测试（7例）
```

## 快速开始

### 环境要求

- Node.js >= 20
- npm >= 10

### 安装与启动

```bash
# 1. 克隆仓库后进入项目根目录

# 2. 安装并启动后端
cd backend
npm install
npm run seed      # 初始化 SQLite 数据库与种子数据（仅需一次）
npm start         # 启动 API 服务，默认监听 http://localhost:3000

# 3. 另开终端，安装并启动前端
cd frontend
npm install
npm run dev       # 启动开发服务器，默认 http://localhost:5173
```

### 访问应用

浏览器打开 `http://localhost:5173`，选择学生后即可查看：
- 认知雷达图（五维掌握概率）
- 知识掌握地图（力导向图谱）
- 诊断详情列表
- AI 个性化学习建议

## 核心算法：DINA 模型

本项目采用 **DINA (Deterministic Inputs, Noisy "And" gate)** 模型，核心假设：

> 学生答对某题当且仅当他掌握了该题考察的所有知识点（确定性 AND 门），但存在两种噪声：
> - **Slip (s)**：掌握了却答错的概率
> - **Guess (g)**：没掌握却猜对的概率

### 参数估计流程（EM 算法）

1. **初始化**：slip = 0.1，guess = 0.2，属性模式均匀先验
2. **E-step**：基于当前参数，计算每个学生属于各属性掌握模式的后验概率
3. **M-step**：更新 slip、guess 及模式先验分布
4. **输出**：每个学生在每个知识点上的**边际掌握概率** P(αₖ = 1)

### 数值稳定性

E-step 使用**对数似然**配合 log-sum-exp 技巧，避免 20 题连续相乘导致的浮点下溢。slip/guess 参数裁剪至 [0.01, 0.4] 防止退化。

## 三大开发范式

### 1. SDD（契约/模型驱动）

- 先定义数据库 Schema（6 张表）、ER 图、API 接口契约
- `docs/schema.md` 作为后续前端（DDD）与算法（TDD）的"锚点"
- 类型定义严格对齐 Schema，前后端共享同一套数据契约

### 2. DDD（设计驱动）

- 以 UI/UX 设计为"宪法"驱动前端组件拆分
- `docs/ui-design.md` 包含布局、交互流程、视觉规范、Mock 数据策略
- 前端组件预留 `DiagnosisResult` props 注入点，便于后续替换真实数据源

### 3. TDD（测试驱动）

- **数据库层**：先写 `db.test.ts`（红）→ 实现 `db.ts` + `seed.ts`（绿）
- **算法层**：先写 `dina.test.ts`（红）→ 实现 `dina.ts` EM 算法（绿）
- **整合层**：先写 `integration.test.ts`（红）→ 实现 `diagnosis.ts`（绿）
- **E2E 层**：使用 supertest 验证完整 API 链路

## 测试

```bash
cd backend
npm test          # 运行全部 25 个测试
```

| 测试文件 | 用例数 | 覆盖内容 |
|----------|--------|----------|
| `db.test.ts` | 8 | 建表、种子数据、Q/X 矩阵导出 |
| `dina.test.ts` | 5 | 理想反应模式、似然计算、确定性案例、边界检查、收敛性 |
| `integration.test.ts` | 5 | 数据库 -> DINA 算法整合，学生画像排序验证 |
| `e2e.test.ts` | 7 | API 端到端：学生列表、诊断结果、404、建议接口 |

## 交付物清单

- [x] 完整项目源码（本仓库）
- [x] 算法逻辑说明（见上文"核心算法"及 `backend/src/algorithm/dina.ts` 注释）
- [x] 开发文档（`docs/schema.md`、`docs/ui-design.md`、`docs/process.md`、`prompts.md`）
- [x] 环境配置与运行指南（见上文"快速开始"）
- [x] 清晰的 Git Commit 演进历史（SDD → DDD → TDD → Stage 4）
- [x] 核心 Prompt 记录文档（≥ 5 段，Step 0~4 完整）

## 隐藏需求（加分项）

**LLM 个性化学习建议**

后端 `POST /api/diagnosis/suggest` 接口：
- 优先调用真实大模型 API（OpenAI 兼容接口，需配置环境变量 `OPENAI_API_KEY`）
- 无 API Key 时**退化**到规则模板生成建议，保证功能随时可用
- 前端实时展示建议文本

## License

MIT
