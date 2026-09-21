# Demo 0.4 功能矩阵

| 子系统 | Demo 0.4 可验收能力 | 无外部服务时的行为 |
|---|---|---|
| 课程知识库与知识图谱 | TXT/MD/PDF/PPTX 上传、清洗切分状态、知识抽取、质量校验、前置/包含/因果/关联关系、缩放筛选、节点编辑 | TXT/MD 真读取；PDF/PPTX 走稳定解析适配层 |
| 多模态内容 | 沉浸文本、选择/填空/判断测验、难度分级、PPT 与旁白、双 AI 音频、思维导图、互动 HTML 教材、模拟参数 | 使用课程结构和知识图谱生成稳定内容 |
| 双导师教学 | 教师发布管理、资料管理、班级学情；AI 导师按掌握度与兴趣生成学习路径 | 本地画像与规则引擎可用 |
| 多智能体课堂 | AI 导师、AI 同学、记录员、项目教练可配置；主动讨论、对话历史、自动白板、实时笔记 | 全部角色在浏览器中可演示 |
| 智能教学辅助 | PPT 聚光灯、TTS、ASR、AI 白板、课后测验、项目式学习 | TTS/ASR 优先浏览器能力，缺失时展示明确降级 |
| 学习记录与分析 | 浏览、测验、讨论、时长记录；知识点掌握度、薄弱点、兴趣推荐、报告视图 | localStorage 持久化 |
| 多模型与导出 | DeepSeek、通义千问、Kimi、MiniMax 统一 Provider；HTML、JSON、PPTX、ZIP | 无密钥时使用本地演示 Provider |

课堂 ZIP 包包含 `lesson.html`、`lesson.json`、`learning-report.json`、`teacher-notes.txt` 和 `README.txt`。导出的 PPTX 由原生 Office Open XML 组成，文本保持可编辑。
