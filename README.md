# 智能化认知诊断平台 MVP

这是一个面向简历展示和实习/工作面试讲解的全栈教育诊断项目。项目目标不是做复杂学校系统，而是完成一个清晰、可运行、可解释的产品闭环：

```text
教师登录
-> 上传固定模板 Excel 成绩
-> 系统预览并校验数据
-> 教师确认入库
-> 后端运行 DINA 诊断
-> 学生使用 student_no 注册账号
-> 教师审核学生账号绑定申请
-> 学生登录查看自己的成绩、知识点掌握情况和学习建议
```

## MVP 范围

已完成：

- 教师/学生角色登录
- 基于角色的权限控制
- 学生通过 `student_no` 自助注册账号
- 教师审核学生注册绑定申请
- `pending/rejected` 学生不能查看成绩和诊断
- `approved` 学生只能查看自己的成绩和诊断
- 教师上传固定模板 `.xlsx` 成绩文件
- 上传预览、错误行提示、确认入库
- SQLite 存储用户、班级、学生、题目、Q 矩阵、作答记录和诊断结果
- DINA-based 知识点掌握概率计算
- 学生端掌握率可视化和规则推荐建议
- 后端 E2E 测试覆盖上传诊断、学生注册、教师审核和权限边界

暂时不做：

- OCR 扫描件识别
- Word/PDF 试卷解析
- 邮箱/短信验证码
- 真实 LLM 调用
- 复杂管理员后台
- 多租户学校系统
- 可变 Excel 模板

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React, TypeScript, Vite, ECharts, CSS Modules |
| 后端 | Node.js, Express, TypeScript |
| 数据库 | SQLite, better-sqlite3 |
| Excel | xlsx |
| 测试 | Vitest, supertest |

## 项目结构

```text
.
├── backend/                  后端 API、SQLite、算法与测试
│   ├── src/
│   │   ├── db.ts             数据库连接与 schema 初始化
│   │   ├── seed.ts           Demo 数据初始化
│   │   ├── diagnosis.ts      诊断/聚合逻辑
│   │   ├── server.ts         Express API 入口
│   │   └── algorithm/        DINA 算法模块
│   └── tests/                后端测试与 E2E 流程
├── frontend/                 React 前端
│   └── src/
│       ├── App.tsx           页面主入口
│       ├── components/       图表和页面组件
│       └── data/             API 适配
├── docs/
│   ├── schema.md             数据库 Schema 设计
│   ├── api.md                REST API 契约
│   ├── architecture.md       架构与权限边界
│   ├── excel-template.md     固定 Excel 模板说明
│   └── student-registration-review.md
├── RUNNING.md                Windows 运行说明
├── start.bat                 Windows 双击启动脚本
├── start-dev.ps1             PowerShell 启动脚本
└── package.json              根目录统一命令
```

## 一键运行

在 Windows 根目录执行：

```powershell
npm.cmd start
```

或双击：

```text
start.bat
```

访问：

```text
http://localhost:5173
```

后端默认地址：

```text
http://localhost:3000
```

## 测试账号

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 教师 | `teacher01` | `password123` |
| 学生 | `stu001` | `password123` |

学生自助注册时，需要填写老师已上传/已存在学生记录中的 `student_no`。测试中常用 `S001`、`S002`、`S003`。

## 学生注册流程

1. 学生在登录页切换到“学生注册”。
2. 填写 `username`、`password`、`student_no`。
3. 后端检查 `student_no` 是否存在于 `students` 表。
4. 如果存在且未绑定账号，创建 `pending` 学生账号。
5. 学生可登录查看审核状态，但不能查看成绩和诊断。
6. 教师在审核列表中通过后，学生状态变为 `approved`。
7. 学生重新登录后可以查看自己的成绩、知识点掌握情况和学习建议。

## student_no 绑定规则

- `student_no` 是学生注册和成绩记录绑定的唯一业务键。
- `student_no` 不存在时返回：`未找到该学号，请确认老师已上传成绩。`
- `student_no` 已绑定 `user_id` 时返回：`该学号已绑定账号。`
- 绑定成功后写入 `students.user_id`，并创建 `users.status = 'pending'` 的学生账号。
- 被拒绝的账号状态为 `rejected`，不能查看成绩；当前实现保留绑定关系，便于审计和防止重复申请。

## 老师审核说明

教师登录后可在“学生注册审核”区域查看待审核申请。教师只能审核自己班级下的学生绑定申请，可以执行：

- 通过：学生账号变为 `approved`，可查看自己的成绩和诊断。
- 拒绝：学生账号变为 `rejected`，只能查看拒绝状态，不能查看成绩和诊断。

## 常用命令

根目录：

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run lint
npm.cmd run check
```

后端：

```powershell
cd C:\Users\User\Desktop\project\backend
npm.cmd test
npm.cmd run build
```

前端：

```powershell
cd C:\Users\User\Desktop\project\frontend
npm.cmd run dev
npm.cmd run build
```

## 核心 API

```text
POST /api/auth/login
POST /api/auth/register-student
GET  /api/student/me/status
GET  /api/student/me/results
GET  /api/student/me/diagnosis?examId=:examId

GET  /api/teacher/classes
POST /api/teacher/uploads/preview
POST /api/teacher/uploads/:uploadId/confirm
GET  /api/teacher/student-approvals
POST /api/teacher/student-approvals/:studentId/approve
POST /api/teacher/student-approvals/:studentId/reject
```

## 测试覆盖

后端测试覆盖：

- 数据库初始化和 seed 数据
- DINA 算法输出
- 教师 Excel 上传预览和确认入库
- 学生个人成绩和诊断 API
- 学生注册与 `student_no` 绑定
- 教师审核通过/拒绝
- `pending/approved/rejected` 权限边界
- 学生不能查看其他学生数据

运行：

```powershell
npm.cmd --prefix backend test
```

学生注册审核流程说明：

- [docs/student-registration-review.md](docs/student-registration-review.md)

## 交付文档

- [docs/schema.md](docs/schema.md)
- [docs/api.md](docs/api.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/excel-template.md](docs/excel-template.md)
- [docs/prompts.md](docs/prompts.md)
- [docs/development-notes.md](docs/development-notes.md)
- [docs/student-registration-review.md](docs/student-registration-review.md)
