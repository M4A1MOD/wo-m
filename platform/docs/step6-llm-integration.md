# 第六步：统一大模型接入

2026-09-20。代码接入完成，外部供应商真实调用待配置密钥和模型后验收。本轮没有安装软件，没有调用付费模型。

## 已实现

- DeepSeek、通义千问、Kimi、MiniMax 共用 Chat Completions HTTP 适配层，支持提供商 ID 及现有页面显示名称。
- 课程生成将主题、学科、年级、时长、教学目标及内容风格发送给模型，验证返回课程结构、场景数量和选择题答案索引，统一分配场景时长。
- 问答携带当前问题、场景、知识点和最近历史；历史中的前端角色转换成 user/assistant，不允许历史记录提升为 system 指令。
- 响应包含真实来源 `provider`、`model` 和 `mode=live/mock`。演示模板始终标记 mock，不再把所选供应商名称冒充实际来源。
- 页面从服务端读取提供商配置状态，禁用未配置选项。真实模型调用失败时显示错误，不再静默替换为成功的演示课程或模板回答。
- 处理缺配置、鉴权失败、额度/限流、连接失败、超时、输出截断、非法 JSON 和不符合课堂格式等情况；错误响应不含密钥或供应商原始错误正文。
- MiniMax 请求启用 reasoning_split，避免将思考标签混入预期 JSON 内容。调用为非流式，无自动重试或隐式跨供应商切换。

## 本机配置

1. 将 `D:\wo-m\platform\.env.example` 复制为同目录 `.env`（如果已有 `.env`，只补齐字段，不覆盖）。`.env` 已被 Git 忽略。
2. 为需要启用的供应商填写 API Key 和控制台实际可用的模型名称，例如：

```dotenv
AI_MOCK_ENABLED=true
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=在本机填写真实密钥
DEEPSEEK_MODEL=填写账户可用的模型ID
```

其他提供商对应 `QWEN_API_KEY/QWEN_MODEL`、`KIMI_API_KEY/KIMI_MODEL`、`MINIMAX_API_KEY/MINIMAX_MODEL`。可同时配置多个供应商。不要把密钥写进前端或发送到聊天中。

`LLM_API_KEY/LLM_MODEL` 是 `LLM_PROVIDER` 指定供应商的兼容配置，供应商专属字段优先；它们不会被发给其他供应商。

默认基础地址：

| 提供商 | 服务端变量 | 默认值 |
| --- | --- | --- |
| DeepSeek | DEEPSEEK_BASE_URL | https://api.deepseek.com |
| 通义千问 | QWEN_BASE_URL | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| Kimi | KIMI_BASE_URL | https://api.moonshot.cn/v1 |
| MiniMax | MINIMAX_BASE_URL | https://api.minimax.cn/v1 |

根据账号地域、业务空间和官方控制台要求调整基础地址。模型名称不内置默认值，避免自动选择无权限或过期的模型。

`AI_MOCK_ENABLED=true` 表示允许演示，默认选择 mock；仍可手动选择已配置的真实供应商。设为 false 时禁止服务器演示请求，默认使用 `LLM_PROVIDER`。服务完全断开时，前端独立的本地演示界面仍可使用。

配置读取顺序：`platform/.env` → `platform/ai-service/.env` → 进程环境变量（后者优先）。配置有进程内缓存，修改后需重启 AI 服务并刷新页面。

3. 在 `D:\wo-m\platform\ai-service` 启动：

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

4. 同时启动后端和前端；进入课堂生成页选择已配置供应商。`configured` 只表示存在密钥和模型名，不代表已验证账号权限。首次真实调用会发送教学输入并可能产生供应商费用。

## 验证结果与边界

- 前端 TypeScript/Vite 构建通过，后端 Maven 编译通过；后端仍没有既有单元测试。
- 通过 HTTP MockTransport 验证四家请求地址、鉴权头、模型名、内容风格、历史消息、课程生成和问答响应解析。
- 验证鉴权错误、限流、上游错误、非法响应、超时、缺配置、未知供应商和禁用 mock；错误内容不泄漏测试密钥。
- 用真实运行的 Spring Boot、FastAPI 和本地供应商 HTTP 模拟服务执行前端 generate/askTeacher 函数，验证生成、聊天、提供商状态以及失败时不新增课程、不产生伪造答案。
- 上述前端函数测试使用模拟 Vue 响应式环境，不等同于完整浏览器点击测试。
- 当前实际配置中四家供应商均缺少完整密钥/模型配置；尚未验证真实账号可用性、模型生成质量、实际耗时和费用。
- 本轮不包括流式输出、多智能体编排、资料解析、TTS/ASR、图片生成，以及完整课堂后端持久化；原有静态 HTML 演示文件也未重新打包。

## 协议依据

- [DeepSeek 官方调用说明](https://api-docs.deepseek.com/zh-cn/)
- [通义千问官方兼容接口](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)
- [Kimi 官方 Chat Completions](https://platform.kimi.com/docs/api/chat)
- [MiniMax 官方兼容接口](https://platform.minimax.cn/docs/api-reference/text-openai-api)
