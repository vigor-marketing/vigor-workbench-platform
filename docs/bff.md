# 平台 BFF（第二阶段）

`apps/bff` 是工作平台的唯一业务聚合入口。首期只实现：当前身份、应用目录、待办查询和待办完成状态更新。

## 运行方式

```bash
docker compose up -d postgres
pnpm install
pnpm bff:dev
```

开发模式下，未配置 `DATABASE_URL` 时使用内存演示待办；这仅方便界面联调，进程重启后数据会重置。配置 Postgres 后，待办数据写入 `workbench_todos`。

## 当前 API

- `GET /api/health`
- `GET /api/me`
- `GET /api/apps`
- `GET /api/todos`
- `PATCH /api/todos/:id`，请求体 `{ "completed": true }`

开发环境默认启用 `DEMO_MODE=true`，可用 `X-Demo-Role` 切换演示角色。生产环境必须明确设置 `DEMO_MODE=false` 并接入 Keycloak OIDC；此时未认证请求必须被拒绝，不能继续接受该请求头。

## 数据边界

本服务只保存工作台自己的待办、应用注册、角色映射与审计索引。它不直接连接三个模块的业务数据库；跨模块信息只能通过模块 API 或版本化事件写入平台。
