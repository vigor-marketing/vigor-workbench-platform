# 001｜BFF 私网 PostgreSQL 联通续接任务

先阅读 `000-project-memory.md`、`INDEX.md` 与 `2026-08-07-bff-todo-handoff.md`。

当前用户决定改用现有腾讯云 CVM 作为工作台运行时，而非继续以 CloudBase PostgreSQL 作为工作台生产存储。CloudBase 中已有 `workbench` schema/演示数据保留但不再作为当前部署路径；不得删除，除非用户确认。

已完成真实联通：BFF 新增 `TODO_STORAGE=cloudbase-pg` 适配器，使用官方腾讯云 Node SDK 的 `ExecutePGSql` 接口和 `vigor_workbench_app` 最小权限 role。TypeScript 编译通过；临时本机服务已验证 `/api/health`、`GET /api/todos`、`PATCH /api/todos/todo-01`，并将测试状态恢复为未完成。

已完成 CVM 只读体检：Ubuntu 26.04、Docker 29.1.3、Docker Compose 2.40.3、约 61 GB 可用磁盘、约 1.9 GB 可用内存、6 GB swap，当前没有 Docker 容器。已有 Node 服务监听公网 3000，且 UFW 放行 3000；该服务不得触碰。SSH/3000 当前对公网开放；不要在未经用户确认时改动防火墙。

下一步只需向用户确认工作台使用的现有域名/子域名。确认后准备 Docker Compose + Nginx/Caddy：仅公开 80/443，BFF、PostgreSQL 和管理端口保持 Docker 私网；先完成内测版（管理员访问密码），再接入 OIDC 与细粒度角色。正式发布前须明确备份目的地、域名 DNS、TLS 自动签发方式和 `DEMO_MODE=false` 身份方案。
