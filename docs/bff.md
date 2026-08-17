# 平台 BFF（第二阶段）

`apps/bff` 是工作平台的唯一业务聚合入口。首期只实现：当前身份、应用目录、待办查询和待办完成状态更新。

## 运行方式

```bash
docker compose up -d postgres
pnpm install
pnpm bff:dev
```

开发模式下，未配置 `DATABASE_URL` 时使用内存演示待办；这仅方便界面联调，进程重启后数据会重置。配置 Postgres 后，待办数据写入 `workbench_todos`。

连接腾讯云 PostgreSQL 时必须设置 `DATABASE_SSL=true`、`DATABASE_SSL_CA_PATH` 和 `DATABASE_SSL_SERVERNAME`。BFF 会验证 CA 与服务端名称，缺少任一配置将拒绝启动；不要用 `rejectUnauthorized=false` 绕过验证。数据库保持私网访问，开发机测试通过受限 SSH 隧道进行。

复用 CloudBase PostgreSQL 时，设置 `TODO_STORAGE=cloudbase-pg`、`CLOUDBASE_ENV_ID` 与 `CLOUDBASE_PG_ROLE`。BFF 通过腾讯云 `ExecutePGSql` 管理接口、以专用数据库角色读写 `workbench.workbench_todos`，不开放数据库公网连接。`TENCENTCLOUD_SECRET_ID` 和 `TENCENTCLOUD_SECRET_KEY` 只能以 CloudBase 运行时密钥变量或本机临时环境变量提供，严禁提交到仓库。

## 当前 API

- `GET /api/health`
- `GET /api/me`
- `GET /api/apps`
- `GET /api/todos`
- `PATCH /api/todos/:id`，请求体 `{ "completed": true }`

开发环境默认启用 `DEMO_MODE=true`，可用 `X-Demo-Role` 切换演示角色。生产环境必须明确设置 `DEMO_MODE=false` 并接入 Keycloak OIDC；此时未认证请求必须被拒绝，不能继续接受该请求头。

## 数据边界

本服务只保存工作台自己的待办、应用注册、角色映射与审计索引。它不直接连接三个模块的业务数据库；跨模块信息只能通过模块 API 或版本化事件写入平台。
