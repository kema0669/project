# 一键运行说明

本项目在 Windows 下提供两种一键启动方式。当前 MVP 的产品闭环是：教师上传固定模板 Excel 成绩，系统校验并确认入库，学生登录后查看自己的诊断结果。

## 方式一：双击启动

双击根目录的 `start.bat`。

脚本会自动完成：

1. 检查 Node.js 和 npm
2. 首次运行时安装 `backend` 依赖
3. 首次运行时安装 `frontend` 依赖
4. 首次运行时初始化 SQLite 数据库
5. 分别启动后端和前端
6. 自动打开浏览器访问 `http://localhost:5173`

停止项目时，关闭脚本打开的两个服务窗口即可。

## 方式二：命令行启动

在项目根目录执行：

```powershell
npm.cmd start
```

也可以执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

## 常用检查命令

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run lint
npm.cmd run check
```

其中 `npm.cmd test` 会运行后端测试，`npm.cmd run build` 会构建前后端，`npm.cmd run lint` 会检查前端代码，`npm.cmd run check` 会串联测试、构建和 lint。

## 访问地址

- 前端页面：http://localhost:5173
- 后端接口：http://localhost:3000
- 后端健康/API 地址：http://localhost:3000

## Excel 导入

固定模板见 `docs/excel-template.md`。

后续实现阶段会补齐教师上传预览、错误行提示、确认入库、DINA 诊断和学生端可视化页面。
