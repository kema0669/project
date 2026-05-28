# 智能化认知诊断与多学科成绩分析 MVP

本项目是一个面向学校真实考试场景的轻量级教育数据分析系统。项目已从早期“单一数学 Q1-Q20 认知诊断 Demo”升级为“多年级、多学科、多考试批次、单科题目分析、考点掌握分析、AI 辅助试卷解析草稿”的完整 MVP。

## 项目定位

系统用于帮助老师和教研人员查看学生在不同考试中的成绩变化、排名变化、单科题目得分情况和考点掌握情况。

当前版本重点不是自动阅卷，而是构建一个清晰、可解释、可扩展的数据分析链路：

```text
学生 / 年级 / 班级
-> 考试批次
-> 学科试卷
-> 每题得分
-> 单科成绩
-> 排名趋势
-> 考点掌握
-> AI 辅助试卷解析草稿
```

## 核心能力

- 支持语文、数学、英语、物理、化学、生物、政治、历史、地理 9 门学科
- 支持不同年级学习不同科目
- 支持多次考试批次
- 支持学生所学科目的成绩雷达图
- 支持总分趋势、班级排名趋势、年级排名趋势
- 支持各科成绩趋势
- 支持单科题目分析
- 支持每题满分、得分、得分率、低分题列表
- 支持单科考点掌握地图
- 支持考点掌握趋势和薄弱考点排序
- 支持 AI 辅助试卷解析草稿流程
- 支持老师确认后再进入正式入库流程
- 支持一键启动

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 19、TypeScript、Vite、ECharts、CSS Modules |
| 后端 | Node.js、Express 5、TypeScript |
| 数据库 | SQLite、better-sqlite3 |
| 测试 | Vitest、supertest |
| AI 扩展点 | 试卷解析草稿、候选考点推荐、老师确认机制 |

## 项目结构

```text
.
├── backend/                  后端 API、数据库、测试
│   ├── src/
│   │   ├── db.ts             SQLite Schema 与旧库兼容重建
│   │   ├── seed.ts           多年级、多学科、多考试种子数据
│   │   ├── diagnosis.ts      成绩分析、题目分析、考点掌握聚合
│   │   ├── paperDrafts.ts    AI 辅助试卷解析草稿流程
│   │   └── server.ts         Express API
│   └── tests/                后端单元测试、集成测试、E2E 测试
├── frontend/                 React 前端
│   └── src/
│       ├── App.tsx           页面主流程
│       ├── data/mock.ts      API 客户端封装
│       └── components/       图表和分析组件
├── docs/
│   ├── ai-paper-workflow.md  AI 辅助试卷解析设计说明
│   └── excel-import.md       Excel 导入格式说明
├── RUNNING.md                一键运行说明
├── start.bat                 Windows 双击启动脚本
├── start-dev.ps1             PowerShell 启动脚本
└── package.json              根目录统一命令
```

## 一键运行

推荐在项目根目录执行：

```powershell
npm.cmd start
```

或者直接双击：

```text
start.bat
```

启动后访问：

```text
http://localhost:5173
```

后端默认运行在：

```text
http://localhost:3000
```

## 手动运行

如果你想分别启动前后端：

```powershell
cd C:\Users\User\Desktop\project\backend
npm.cmd install
npm.cmd start
```

再打开另一个终端：

```powershell
cd C:\Users\User\Desktop\project\frontend
npm.cmd install
npm.cmd run dev
```

## 测试

在项目根目录执行：

```powershell
npm.cmd test
npm.cmd run build
```

当前验证结果：

```text
backend tests: 34 passed
frontend build: passed
```

## 主要 API

### 学生与考试

```text
GET /api/students
GET /api/exams
GET /api/students/:studentId/subjects
```

### 多学科成绩总览

```text
GET /api/students/:studentId/exams/:examId/overview
GET /api/students/:studentId/trends
```

### 单科题目分析

```text
GET /api/students/:studentId/exams/:examId/subjects/:subjectId
```

返回单科总分、班级排名、年级排名、每题满分、每题得分、得分率和低分题列表。

### 单科考点掌握

```text
GET /api/students/:studentId/exams/:examId/subjects/:subjectId/knowledge
GET /api/students/:studentId/subjects/:subjectId/knowledge-trends
```

考点掌握率基于“每题得分率 × 题目-考点权重”聚合得到，当前阶段强调可解释性。

### AI 辅助试卷解析草稿

```text
POST /api/paper-drafts
GET /api/paper-drafts/:draftId
POST /api/paper-drafts/:draftId/confirm
```

当前版本使用规则引擎模拟 AI 推荐考点。真实 LLM、OCR、Word/PDF 解析可以在 `backend/src/paperDrafts.ts` 中替换候选生成逻辑。

## 五阶段开发成果

### 阶段一：数据模型升级

从固定 Q1-Q20 模型升级为：

```text
年级 -> 学科 -> 考试 -> 试卷 -> 题目 -> 学生成绩 -> 考点映射
```

### 阶段二：多学科成绩总览

实现学生选择、考试选择、学科成绩雷达图、总分趋势、班级排名趋势、年级排名趋势、各科成绩趋势。

### 阶段三：单科题目分析

实现单科总分、单科排名、每题满分、每题得分、每题得分率、低分题列表。

### 阶段四：单科考点掌握分析

实现考点掌握地图、考点掌握趋势、薄弱考点排序。

### 阶段五：AI 辅助试卷解析扩展点

实现试卷解析草稿、候选考点推荐、老师确认机制。AI 推荐结果不会直接写入正式试卷表，避免错误污染正式数据。

## 数据库兼容说明

项目启动时会检测旧版 Demo 数据库。如果发现旧表结构，例如旧 `students` 表没有 `grade_id`，系统会自动重建为新版多学科 schema，并写入新的种子数据。

## 后续可扩展方向

- 长表 Excel 导入
- 老师确认草稿后的正式入库 UI
- Word/PDF 试卷文本解析
- OCR 识别扫描件
- 接入真实 LLM 推荐题目考点
- 更细粒度的班级、年级、学期管理

## License

MIT
