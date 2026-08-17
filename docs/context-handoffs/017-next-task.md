# 017 — CVM + COS 部署基线与待办持久化

更新时间：2026-08-12（Asia/Shanghai）

## 用户确认的永久基础准则

1. 所有工作台与后续小程序仅部署、运行在用户的腾讯云 CVM 实例。
2. 所有业务资料文件仅存入该实例对应的腾讯云 COS。
3. 不使用 CloudBase：不作为运行环境、数据库、文件存储或身份服务。
4. 持续使用 IP 入口 `http://1.15.91.150/`，不配置 HTTPS 或域名。
5. 小程序经工作台同域 `/apps/<app-id>/` 路径接入；BFF、数据库等内部服务只绑定实例本机，由 Nginx 代理。

## 本轮已完成

- 修复 Nginx 工作台路由：`/workspace/apps/<id>` 刷新能返回工作台壳；四个应用的 `/apps/<id>/` 均为同域入口。
- Nginx 已将 `/api/` 转发至 BFF；`/api/health`、`/api/todos` 已验证 HTTP 200。
- AI 销售陪练工作台入口改为同域 `/apps/ai-sales-coach/`，不再使用 IP:3000 外部地址。
- 工作台总览改为动态日期、基于待办的数据统计和基于岗位权限的可用模块列表。
- 已创建并启用 `vigor-workbench-bff.service`。
- BFF 监听已限制为 `127.0.0.1:4000`；Nginx 是唯一外部访问路径。
- BFF 待办存储从内存演示改为实例本地受限文件：`/var/lib/vigor-workbench/todos.json`（0600）。
- 审计文件预留：`/var/lib/vigor-workbench/audit.jsonl`（0600；业务事件写入后创建）。
- BFF 已删除 CloudBase 代码路径与依赖，编译、启动和 `/api/health` 验证通过，返回 `todoStorage: file`。
- 云端基线文档：`/opt/vigor-workbench-pilot/app/docs/deployment-storage-baseline.md`。

## 当前运行状态

- `vigor-workbench.service`：工作台 Vite Preview，8088，仅本机。
- `vigor-workbench-bff.service`：BFF，4000，仅本机。
- AI 销售陪练原 3000 服务未停止或修改。
- 产品编码器 18080、销售提成 18081 仍为实例内部代理目标。
- 知识库由现有 4180 Docker 代理目标提供。

## 重要边界

- 当前 HTTP/IP 模式只适合内测。不得在该环境录入真实高敏感密码、客户、合同、财务等数据。
- 本地文件只用于系统状态与过渡性待办；所有业务资料附件、归档、导出文件须进入 COS，数据库/状态文件仅记录 COS 对象键、版本、校验值和审计信息。
- 账号与权限仍为浏览器 localStorage 内测实现，尚未服务端化。

## 后续优先任务

1. 为 BFF 增加受控的业务事件接口（创建/完成/逾期待办）并由每个应用逐项接入。
2. 接入 COS SDK：统一上传、下载授权、对象命名、版本与归档位置字段。
3. 将账号、角色和权限迁移至实例内 PostgreSQL 或受限本地存储；不使用 CloudBase。
4. 收紧仍开放的 3000、4180 等公网端口（需用户单项确认，避免影响既有应用）。

