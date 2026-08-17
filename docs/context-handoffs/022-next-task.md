# 022 — 工作台应用权限服务器持久化

更新时间：2026-08-13

## 本轮完成

- 应用岗位授权已从前端 `localStorage` 模拟配置迁移到 BFF 服务器文件：`/var/lib/vigor-workbench/app-permissions.json`，权限模式 `0600`。
- BFF `AppsService` 启动时读取此文件；`/api/apps`、应用入口网关与工作台页面使用同一份岗位规则。
- 新增管理员专属 API：
  - `GET /api/admin/app-permissions`
  - `PUT /api/admin/app-permissions/:appId`
- 工作台导航、总览、应用嵌入页已改为从 `/api/apps` 获取服务器授权，不再从浏览器 localStorage 读取应用权限。
- 管理员导航新增“应用岗位权限”页面，可为每个应用勾选岗位并保存到服务器。
- 初始服务器权限与此前已确认的默认范围完全一致：AI 销售陪练、产品编码器、销售提成、企业知识库共四个应用。

## 验证

- BFF 与工作台前端均已构建成功，服务为 active。
- 未登录 `GET /api/admin/app-permissions`：401。
- 管理员 `GET /api/admin/app-permissions`：200。
- 管理员 `GET /api/apps`：200。

## 下一项建议

按照用户“逐个完成”原则，进入 CRM / 销售核心模块最小可用版：客户、线索、商机、报价、合同、回款和项目的统一编号与审批流；先做数据模型与销售流程，不在未经确认前扩展采购/财务业务写入。

## 约束

- 不停止或修改 AI 陪练 3000 服务，除非用户明确授权。
- 不暴露 BFF、数据库或任何 API 密钥；AI 密钥继续由工作台代理托管。
- 所有部署在腾讯云 CVM；资料最终落 COS，不使用 CloudBase。
- HTTP/IP 按用户要求维持，真实敏感业务数据前应重新评估会话传输风险。
- 接近上下文压缩时先更新交接文件并创建下一编号交接任务。
