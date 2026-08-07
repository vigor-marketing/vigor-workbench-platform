# 平台 API 契约占位

实施 NestJS BFF 时，先固定以下资源，再让各模块逐步迁移：

- `GET /api/me`：当前身份、角色、组织范围；
- `GET /api/apps`：应用目录与可访问性；
- `GET /api/todos`：待办聚合；
- `POST /api/events`：受版本约束的跨模块事件入口；
- `GET /api/audit`：审计查询（仅授权管理角色）。

这些契约必须经过代码评审和版本管理后才可向模块开放。
