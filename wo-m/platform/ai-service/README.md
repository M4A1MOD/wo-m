# ai-service

FastAPI AI 服务只处理 AI 能力，不管理业务权限和核心业务状态。

建议模块：

- `app/api`：HTTP 路由。
- `app/services`：课堂生成、问答、测验、图像识别服务。
- `app/rag`：资料解析、分段、向量索引和召回。
- `app/models`：LLM、YOLOv8、PyTorch 或 TensorFlow 模型适配器。
- `app/schemas`：Pydantic 请求响应结构。
- `app/core`：配置、日志、异常和依赖注入。

