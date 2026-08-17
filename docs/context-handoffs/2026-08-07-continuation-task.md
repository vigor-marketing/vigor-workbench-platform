# 统一工作台｜续接任务（压缩轮次 2）

先阅读同目录的 `2026-08-07-bff-todo-handoff.md`，它是当前工作的唯一完整锚点。保留其中全部业务权限、工作台接入、BFF、GitHub 与腾讯云安全约束。

## 当前状态

- 工作台前端与 NestJS BFF 已完成本地内存模式联通和构建验证。
- 腾讯云已有 PostgreSQL 17 实例上已创建隔离的 `vigor_workbench_test` 数据库与 `vigor_workbench_app` 应用账号；密码仅存本机钥匙串，绝不能写入项目、Git、对话或日志。
- PostgreSQL TLS 已启用。
- 临时公网入口已关闭；临时安全组没有入站规则。不得重新使用明文公网数据库连接。
- `database/init.sql` 尚未在腾讯云测试库执行；真实 BFF PostgreSQL 冒烟测试尚未完成。

## 下一步

在用户确认部署形态后，优先选择同 VPC/CloudBase 私网 BFF 或最小权限 SSH 隧道，使用 TLS 连通测试库；执行 `database/init.sql`，再验证 BFF 的 `/api/health`、`/api/todos` 和 `PATCH /api/todos/:id`。

## 必须遵守

- 三个既有应用通过工作台同域反向代理接入，不允许 GitHub iframe。
- 跨应用仅使用 API/事件，不直接跨库写入。
- 不在生产使用 `X-Demo-Role`；生产认证要接 OIDC。
- 若再次接近上下文压缩，先增量更新交接文件与续接任务，然后再继续。
