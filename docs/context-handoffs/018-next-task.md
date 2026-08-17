# 018 — 统一业务事件接口已就绪

更新时间：2026-08-12（Asia/Shanghai）

## 承接基线

- 完整阅读 `017-next-task.md`。其 CVM + COS、禁止 CloudBase、IP 入口、同域路径等规则均为强制规则。
- 当前工作台 BFF：`vigor-workbench-bff.service`，仅监听 `127.0.0.1:4000`，通过 Nginx 的同域 `/api/` 暴露。
- 待办文件：`/var/lib/vigor-workbench/todos.json`；审计文件：`/var/lib/vigor-workbench/audit.jsonl`，权限 0600。

## 本轮完成

- BFF 新增 `POST /api/events` 统一业务事件入口。
- 支持事件：`todo.created`、`todo.completed`、`todo.overdue`。
- 事件要求稳定的 `eventId`；同一 ID 重复提交返回 `duplicate: true`，不重复创建待办。
- 所有事件会写入实例本地审计日志；待办状态写入实例本地受限存储。
- 已完成完整冒烟验证：创建待办、相同事件重试、完成待办、审计记录均正确；验证用待办已从状态文件清除。
- 文档：云端 `/opt/vigor-workbench-pilot/app/docs/business-event-contract.md`。
- BFF 构建、服务启动、`/api/health` 验证通过，返回 `todoStorage: file`。

## 首批三应用接入建议（需按模块确认后实施）

| 应用 | 建议创建事件 | 建议完成事件 | 说明 |
|---|---|---|---|
| AI 销售陪练 | 为用户安排训练时 `todo.created` | 训练报告生成且复盘确认时 `todo.completed` | 陪练数据必须继续与真实客户资料隔离。 |
| 产品编码器 | 编码导入校验失败或待补参数时 `todo.created` | 导入成功、必填参数齐全时 `todo.completed` | 仅传递编码任务 ID，不传递完整产品资料文件。 |
| 销售提成 | 新核算周期待确认时 `todo.created` | 财务确认/锁定周期时 `todo.completed` | 现阶段只用演示数据，真实财务数据不进入 HTTP 内测。 |

## 仍未完成

1. 每个应用内部调用事件 API 的实际代码接入与端到端验证。
2. COS SDK 接入：上传、下载授权、对象键命名、版本、校验值、归档位置。
3. 服务端账号、角色、动作级权限与审计迁移（不使用 CloudBase）。
4. 清理/收紧公网 3000 与 4180 端口前，必须获得用户单项确认。

