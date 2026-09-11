# 智能互动教学平台工程骨架

本目录已经升级为 Demo 0.2 全栈基础闭环：课程可以新增、查询、修改和删除；前端页面可以生成并保存课程草稿；AI 服务提供稳定的结构化 mock 生成接口；后端可用时通过 API 持久化，服务不可用时自动回退到浏览器本地存储。

## 目录

```text
platform/
├─ frontend/          Vue 3 + Vite + TypeScript
├─ backend/           Spring Boot 3 + Spring Data JPA
├─ ai-service/        FastAPI + LangChain + RAG + YOLOv8 预留
├─ docs/              API、数据和开发说明
├─ scripts/           启动与初始化脚本
├─ .env.example       统一环境变量示例
└─ docker-compose.yml MySQL 与可选基础设施
```

## 服务边界

- `frontend` 只调用 `backend` 暴露的业务 API。
- `backend` 管理认证、权限、课程、场景、审核、测验和答题记录。
- `ai-service` 提供课堂生成、RAG 问答、测验生成、图像识别和训练模型推理接口。
- 模型不可用时，通过 `AI_MOCK_ENABLED=true` 返回稳定模拟结果。

## 建议启动顺序

1. 复制 `.env.example` 为 `.env`，按需配置模型密钥。
2. 启动 AI 服务：进入 `ai-service` 安装依赖并运行 Uvicorn。
3. 启动业务后端：进入 `backend` 运行 Spring Boot。默认使用本地 H2 文件数据库，接口启动即用；配置 `DB_URL` 后可切换 MySQL。
4. 启动前端：进入 `frontend` 安装依赖并运行 Vite。

## Demo 0.2 验收路径

打开前端 → 点击“生成课堂” → 输入主题 → 点击“生成并保存” → 进入互动课堂 → 返回工作台 → 刷新页面 → 课程仍然存在 → 点击“打开”继续查看 → 点击“删除”验证 CRUD。

详细接口与分工见 `docs/开发约定.md`。
