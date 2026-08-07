# 平台架构与接入规则

## 首期范围

平台负责统一入口、待办聚合、提醒、应用目录、身份上下文与审计入口；已接入系统继续负责各自的业务流程和业务数据库。

```text
浏览器
  └─ workbench.example.com
       ├─ /                 工作平台前端
       ├─ /api/*            平台 BFF（后续 NestJS）
       ├─ /apps/ai-sales-coach/*     AI 销售陪练
       ├─ /apps/product-encoder/*    产品编码器
       └─ /apps/sales-commission/*   销售提成

平台 Postgres：应用目录、角色映射、待办索引、审计记录、跨模块映射 ID
模块数据库：各系统自己的业务事实和主数据
```

## 必须遵守的接入契约

1. 每个小程序必须提供 `app.manifest.json`，声明应用 ID、入口、所需角色、能力和健康检查地址。
2. 所有应用通过同一主域名的 `/apps/{app-id}/` 路径提供，禁止 iframe 直接加载 GitHub、IP 地址或第三方站点。
3. 生产身份由 Keycloak（OIDC）签发；平台 BFF 负责令牌校验、角色映射、审计和跨模块 API 调用。
4. 业务系统之间禁止共用数据库账号或直接写表。跨模块数据必须走版本化 API 或事件，例如 `quote.approved.v1`。
5. 所有跨模块数据使用稳定的全局 ID：`customerId`、`opportunityId`、`quotationId`、`contractId`、`projectId`、`employeeId`。
6. 应用嵌入必须允许平台的 `frame-ancestors`，且 CSP、Cookie `SameSite`、反向代理前缀都经过部署验证。

## 下一阶段

- 建立 NestJS BFF：`/api/me`、`/api/todos`、`/api/apps`、`/api/audit`；
- 接入 Keycloak，删除前端演示角色切换；
- 在平台 Postgres 建立待办、审批通知和跨模块 ID 映射表；
- 部署三套应用的同域 Nginx 代理和健康检查；
- 再实现 CRM、采购、财务、船务等后续模块，均复用此契约。
