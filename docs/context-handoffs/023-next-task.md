# 023 — 销售核心模块基线（已验收）

更新时间：2026-08-14

## 已部署

- BFF 新增 `SalesService`，使用受限文件台账 `SALES_FILE`（目标 `/var/lib/vigor-workbench/sales.json`）保存：客户、商机、报价、合同、回款、项目。
- 编号规则：`CUS`、`OPP`、`QTE`、`CON`、`PAY`、`PRJ` + 日期 + 顺序号。
- 新增销售 API：
  - `GET /api/sales/overview`
  - `POST /api/sales/clients`
  - `POST /api/sales/opportunities`
  - `POST /api/sales/quotes`
  - `POST /api/sales/quotes/:id/submit`
  - `POST /api/sales/quotes/:id/approval`
  - `POST /api/sales/contracts`
  - `POST /api/sales/contracts/:id/ci-confirmation`
  - `POST /api/sales/payments`
  - `POST /api/sales/projects`
- 已实现的业务规则：
  - 报价草稿必须提交审批；销售组长/销售经理/销售副总/总经理可审批；除销售副总和总经理外，不可审批本人报价。
  - 审批通过后生成正式报价单编号 `VIGOR-Q-...-V版本号` 与审批审计记录。
  - 合同只能基于已审批报价单；项目只能在合同 CI 确认后创建，且必须指定项目跟进员。

## 验收结果

- BFF TypeScript 构建成功，`vigor-workbench-bff.service` active。
- 未登录销售 API 正确返回 401。
- 已用现有管理员会话完成登录验证（不在此文件记录密码）。
- 已录入且明确标记为“系统验收演示（非真实）”的一套数据：客户、商机、报价、合同、回款、项目各 1 条。
- 已通过完整链路：报价提交与审批、正式报价编号生成、合同创建、CI 确认、回款登记、项目建立；复核时报价为 approved、合同 CI 为 signed、项目为 active。
- 已新增工作台“销售管理”入口和操作页面，并授权总经理、分管销售副总、销售经理、销售组长、销售员、项目跟进员访问。
- 已验证管理员可见销售入口、销售员岗位授权存在、`/workspace/apps/sales-management` 返回 200；前端与 BFF 均完成生产构建，BFF 服务 active。

## 后续建议

1. 由用户决定是否保留这套演示台账；若不保留，可单独确认后清除。
2. 销售下一阶段应补齐：按销售小组的数据范围、报价审批层级、用印申请与合同双档案位置；这些会影响真实业务数据，需逐项确认。
3. 不要绕过用户的一项一确认偏好扩展采购、用印或财务写入。

## 约束

- 不停止或修改 AI 陪练 3000 服务，除非用户明确授权。
- 不暴露 BFF、数据库或 API 密钥；所有部署继续在腾讯云 CVM，资料最终入 COS。
- HTTP/IP 模式仅用于内测；真实客户/合同/财务资料进入前需重新评估传输风险。
