# Demo 0.3 统一正式版整合说明

## 版本定位

Demo 0.3 不是独立覆盖 Demo 0.2，而是在 0.2 可运行闭环上增加多学科 AI 课堂能力。

## 功能组成

| 来源版本 | 纳入统一版的能力 |
| --- | --- |
| Demo 0.2 | 课程 CRUD、Spring Boot API、H2 持久化、刷新恢复、本地离线降级 |
| Demo 0.3 | 学科选择、差异化课堂结构、AI 生成、AI 教师问答、动态测验、教师审核、HTML/JSON 导出 |

## 运行模式

1. 全栈模式：Vue → Spring Boot → FastAPI，课程写入 H2，AI 请求经后端代理。
2. 业务后端不可用：课程内容保存到 localStorage，页面仍可完成完整演示。
3. AI 服务不可用：按学科模板生成课堂，问答使用启发式降级内容，并在界面明确显示状态。

## 统一交付物

- 工程入口：`platform/frontend/`
- 独立入口：`outputs/智能互动教学平台-demo0.3.html`
- 独立入口生成脚本：`work/build_demo03_standalone.js`

独立入口由 `platform/frontend/dist` 自动内联生成，因此课堂内容、交互和工程版保持一致。
