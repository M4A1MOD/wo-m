# 智能互动教学平台 Demo 0.4

Demo 0.4 保留了 Demo 0.2 的课程 CRUD 与持久化、Demo 0.3 的九学科差异化课堂，并加入课程知识库与知识图谱、多模态教学内容、双导师、多智能体课堂、PPT 聚光灯、语音、AI 白板、学习记录和可视化学情分析。

统一离线入口：`outputs/智能互动教学平台-demo0.4.html`。Demo 0.2 和 Demo 0.3 单文件入口继续保留。浏览器中的旧课程会自动迁移并补全 Demo 0.4 数据结构。

## 目录

- `frontend`：Vue 3 + Vite + TypeScript，正式界面与浏览器降级能力。
- `backend`：Spring Boot 3，课程业务与 AI 服务代理。
- `ai-service`：FastAPI，统一模型、资料解析、知识图谱、多模态、语音和报告接口。
- `docs`：功能矩阵、验收记录与开发约定。

## Demo 0.4 验收路径

打开前端后依次体验：生成课堂 → 上传教材/课件 → 编辑知识图谱 → 切换六类多模态内容 → 体验语音、AI 答疑和自动板书 → 启动 AI 同学讨论 → 查看记录员笔记与学情分析 → 导出 HTML、JSON、可编辑 PPTX 或 ZIP 完整课堂包。

运行前端构建：`npm run build`。构建并更新独立版：`npm run build:demo`。
