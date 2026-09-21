# 智学智能互动教学平台

基于 Vue、Spring Boot 与 Python AI 服务构建的互动教学平台，支持课程生成、教学工作台、AI 问答、思维导图、知识关系图、互动教材、项目式学习、图片生成、PPTX/HTML 导出等功能。

## 下载后运行

### 运行环境

首次启动前，请确保 Windows 已安装：

- Node.js 20 或更高版本
- Python 3.11 或更高版本
- JDK 17 或更高版本
- 可用的网络连接（仅首次下载项目依赖时需要）

项目会把 Python、Node.js 和 Maven 依赖安装在项目目录中。

### 一键启动

1. 在 GitHub 项目页面点击 `Code` → `Download ZIP`。
2. 解压整个 ZIP，路径中尽量不要包含特殊符号。
3. 双击根目录的 `一键启动.cmd`。
4. 首次启动会自动准备依赖，耗时取决于网络速度；后续启动会直接复用已有依赖。
5. 浏览器访问 <http://localhost:5173>。

关闭平台时，双击根目录的 `一键停止.cmd`。

## AI 配置

进入平台的“系统设置”页面配置大模型、Ollama、图片生成、TTS 与 ASR 等服务。API Key 和自定义服务地址保存在当前 Windows 用户的应用数据目录中，不写入项目目录，也不会随 GitHub 仓库或 ZIP 包分享。

本地 Ollama 默认可使用 `http://localhost:11434`，需要先在本机启动 Ollama 并下载所需模型。

## 项目结构

```text
platform/
├─ frontend/       Vue 前端
├─ backend/        Spring Boot 后端
├─ ai-service/     Python AI 服务
├─ scripts/        启动、停止与环境准备脚本
├─ 一键启动.cmd
└─ 一键停止.cmd
```

`project-image-asset-generator` 的图片生成能力已经整合进平台源码，原始桌面应用、浏览器运行时、缓存与个人配置不进入仓库。

## 开发启动

也可以在 PowerShell 中运行：

```powershell
cd platform
.\scripts\prepare-platform.ps1
.\scripts\start-platform.ps1
```

首次准备完成后，前端、后端和 AI 服务分别使用端口 `5173`、`8080` 和 `8000`。

