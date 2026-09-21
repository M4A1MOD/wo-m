# 第13步：本机 Ollama 接入

## 当前配置

平台已检测到本机 Ollama 服务及模型 `qwen3.5:4b`。项目通过 Ollama 的 OpenAI 兼容接口 `http://127.0.0.1:11434/v1/chat/completions` 复用现有统一模型层，不再把 Ollama 伪装成“通义千问”。

本机实际配置保存在 `platform/.env`，该文件已被 Git 忽略，不会提交到版本库。配置内容指定：

- 默认提供商：`ollama`
- 默认模型：`qwen3.5:4b`
- 本机地址：`http://127.0.0.1:11434/v1`
- 本地模型超时：180秒
- 保留本地演示模型作为备用

## 使用方法

1. 确认 Ollama 已启动。浏览器访问 `http://127.0.0.1:11434/api/tags` 能看到模型列表即可。
2. 双击 `platform/一键启动.cmd` 启动教学平台。
3. 打开“系统设置 → AI 模型接口”，Ollama 会自动处于已配置状态。
4. 可点击“刷新本机模型”，从下拉框选择其他已安装模型，再点击“启用本机模型”。
5. 创建课堂、AI 答疑、简答题批改和多智能体讨论都可选择 Ollama。

Ollama 不需要真实 API Key。兼容客户端要求存在一个 Key 值时，服务端内部使用固定占位值 `ollama`，不会向云端发送密钥。

## 实现内容

- 模型目录新增 `ollama`，能力标记为 `text`、`local`。
- 新增 Ollama 本机模型查询接口，经 Spring Boot 代理后提供给设置页面。
- 设置页选择 Ollama 时自动隐藏 API Key，并展示模型大小、参数规模和量化类型。
- Ollama 请求启用 JSON 响应格式并关闭思考输出，适配平台现有的结构化课程 Schema。
- Ollama 不在线时明确提示连接失败，不会伪装成真实模型成功。
- `.env.example` 增加标准 Ollama 配置，同时恢复通义千问的官方云端地址，避免两个提供商混用。

## 验证结果

- 本机 `/api/tags` 成功返回 `qwen3.5:4b`，参数规模约4.7B，量化为 Q4_K_M。
- FastAPI 完成真实 Ollama JSON 调用，返回 `provider=ollama`、`model=qwen3.5:4b`、`mode=live`。
- 完成 `前端 → Spring Boot → FastAPI → Ollama` 端到端答疑调用，真实回答长度43个字符。
- 重启平台后目录默认提供商为 Ollama，配置来源为环境文件，演示模型仍可选。
- Edge 页面检查通过：Ollama 标签已配置、本机模型出现在下拉框、API Key 输入不显示。
- Java 构建、Vue 类型检查和前端生产构建均通过。

官方参考：[Ollama OpenAI 兼容接口](https://docs.ollama.com/api/openai-compatibility)、[Ollama 模型列表接口](https://docs.ollama.com/api/tags)。
