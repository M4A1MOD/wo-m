# 智学智能互动教学平台 Demo 0.5

基于 Vue、Spring Boot 与 Python AI 服务构建的互动教学平台，支持课程生成、教学工作台、AI 问答、思维导图、知识关系图、互动教材、项目式学习、图片生成、PPTX/HTML 导出等功能。

## Demo 0.5 文档

本版将原始 0.4 之后的累计功能更新归档为 0.5；程序内部分版本文案和兼容性数据标识仍保留 0.4。

- [功能矩阵](platform/docs/Demo0.5功能矩阵.md)：实现能力、依赖与尚未完成的要求。
- [验收记录](platform/docs/Demo0.5验收记录.md)：沿用 0.4 格式，列出核对范围和实机验收流程。
- [更新说明](platform/docs/Demo0.5更新说明.md)：版本变化、下载运行和配置分享注意事项。

## 下载后运行

### 运行环境

首次启动前，请确保 Windows 已安装：

- Node.js 20 或更高版本
- Python 3.11 或更高版本
- JDK 17 或更高版本
- 可用的网络连接（仅首次下载项目依赖时需要）

项目的 Python 虚拟环境、前端 node_modules、自动下载的 Maven 和后端依赖目录位于项目内。项目位于 D 盘时，这些目录也在 D 盘；基础运行环境安装位置及部分工具默认缓存仍由各自配置决定。

### 一键启动

1. 在 GitHub 项目页面点击 `Code` → `Download ZIP`。
2. 解压整个 ZIP，路径中尽量不要包含特殊符号。
3. 双击根目录的 `一键启动.cmd`。
4. 首次启动会自动准备依赖，耗时取决于网络速度；后续启动会直接复用已有依赖。
5. 浏览器访问 <http://localhost:5173>。

关闭平台时，双击根目录的 `一键停止.cmd`。

## AI 配置

进入平台的“系统设置”页面配置大模型、Ollama、图片生成及浏览器语音。多提供商云端 TTS/ASR 尚未接入。通过设置页保存的模型密钥和接口地址位于当前 Windows 用户的应用数据目录，不随源码仓库分发。

本地 Ollama 的兼容接口默认使用 `http://127.0.0.1:11434/v1`，需要自行启动 Ollama 并下载模型。没有 Ollama 也可启动平台，使用演示模式或云端模型；真实讨论、AI 反馈与简答批改需要可用真实模型。

分享时建议使用 GitHub 的源码下载包。直接压缩开发目录不会应用 `.gitignore`，可能带入 `.env`、课程数据库及上传文件；不要将其视为自动脱敏的发布包。

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


## 开发启动

也可以在 PowerShell 中运行：

```powershell
cd platform
.\scripts\prepare-platform.ps1
.\scripts\start-platform.ps1
```

首次准备完成后，前端、后端和 AI 服务分别使用端口 `5173`、`8080` 和 `8000`。
