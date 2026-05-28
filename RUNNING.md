# 一键运行说明

本项目在 Windows 下提供两种一键启动方式。

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
```

其中 `npm.cmd test` 会运行后端测试，`npm.cmd run build` 会构建前端。

## 访问地址

- 前端页面：http://localhost:5173
- 后端接口：http://localhost:3000
- 学生列表接口：http://localhost:3000/api/students

## Excel 导入

页面顶部有 Excel 导入区。文件格式见 `docs/excel-import.md`。

导入后系统会新增一个测试批次，并在页面中展示该学生的成绩变化曲线和知识点掌握变化曲线。
