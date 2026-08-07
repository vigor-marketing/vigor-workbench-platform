# 工作台上下文交接｜2026-08-07

## 当前目标

建立统一办公工作台：先作为三个既有业务小程序的同域入口，再逐步形成统一权限、待办、数据分析与 AI 能力的平台。

## 已确认的核心规则

- 初期按部门顺序接入：销售 `ai-sales-coach`、采购 `vigor-product-encoder`、财务 `sales-commission`。
- 不能用 GitHub 页面 iframe；生产接入采用同域 Nginx 反向代理 `/apps/{app-id}/`。
- 小程序保有各自业务数据；工作台不直接跨库写入，后续以 BFF、事件和平台映射数据联通。
- 工作台内待办必须实时更新；可转交但需要审批；逾期标红，并通知负责人、发起人、小组长和对应副总经理。
- 总经理和两位副总经理查看全经营数据；销售副总与总经理查看销售明细；组长仅看本组数据。
- 以后每当临近上下文压缩：先生成本类结构化交接文件，再在同一项目创建新对话继续任务。

## 已完成

- 前端 MVP 已完成：React + TypeScript + Vite，含总览、角色切换演示、待办中心、按部门的应用入口与嵌入状态。
- 架构与运行文档已完成：`README.md`、`docs/architecture.md`、`docs/roles-and-access.md`、`docs/nginx.conf.example`、`platform-contracts/README.md`。
- 私有 GitHub 仓库已建立并上传首期代码：<https://github.com/vigor-marketing/vigor-workbench-platform>。
- 已创建 BFF 基础代码与 PostgreSQL 初始化脚本：`apps/bff/`、`database/init.sql`、`docker-compose.yml`、`docs/bff.md`。

## 已完成的 BFF 工作

1. `apps/bff/src/app.controller.ts` 使用明确的 HTTP 异常；空或非法 `completed` 返回 400。
2. PostgreSQL 记录的 `dueAt` 在 BFF 中转换为 ISO 字符串。
3. 本地默认启用 `DEMO_MODE=true`，生产环境仍须明确设置为 `false` 并接入 OIDC。
4. 前端 `src/lib/platform-api.ts` 已接入 `/api/todos`；`src/App.tsx` 在 BFF 不可用时降级到静态演示待办。
5. NestJS 依赖已安装；前端和 BFF TypeScript 编译、Vite production build 均已成功。
6. 本机 BFF 已验证：`GET /api/health` 返回 `memory-demo`；`GET /api/todos` 返回 4 条记录；`PATCH /api/todos/todo-01` 成功更新后可被再次读取；空请求体返回 400。验证后已恢复演示数据。
7. 按正确性、可读性、架构、安全和性能五个维度完成审查：无合并阻塞项。已知限制为演示身份和内存存储仅限本地开发，生产必须先接 OIDC 与 PostgreSQL。

## 关键文件

- 前端入口：`src/App.tsx`
- 静态演示数据：`src/data/workbench.ts`
- BFF：`apps/bff/src/main.ts`、`apps/bff/src/app.controller.ts`、`apps/bff/src/todos.service.ts`
- 数据库：`database/init.sql`
- 环境变量示例：`.env.example`
- BFF 文档：`docs/bff.md`

## 验证状态与注意事项

- 首期前端曾通过 TypeScript 与 Vite build，并在浏览器验证无控制台错误。
- BFF 已完成本地验证，当前为内存演示存储；PostgreSQL 初始化文件已准备但本轮未启动 Docker 数据库验证。
- 本地 Git 根提交与通过 GitHub Contents API 上传形成的远程历史不相连；不要直接普通 `git push`，后续继续使用已连接的 GitHub API 更新文件。当前待同步本次 BFF 文件。
- 正式生产认证尚未接入；当前 BFF 的 `X-Demo-Role` 仅供 `DEMO_MODE=true` 本地演示使用，不能用于生产。
