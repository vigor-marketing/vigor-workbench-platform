# 019 — 工作台统一登录桥接与 API 接入中心

更新时间：2026-08-12（Asia/Shanghai）

## 强制基线

- 所有系统部署在 CVM `ins-59qdrwy7`；IP 入口为 `http://1.15.91.150/`。
- 禁止 CloudBase。业务资料附件进入 COS；本地受限文件仅用于系统配置、状态与审计。
- 小程序经 `/apps/<app-id>/` 同域接入；内部服务仅由 Nginx 代理。
- 当前仍为 HTTP 内测，不能录入真实高敏感业务数据。

## 本轮完成

### AI 销售陪练统一入口

- 已移除前端独立登录页的使用路径。
- 陪练在 iframe 内向工作台请求身份；工作台 BFF 为已获权限的用户签发仅 5 分钟有效、指定受众为 `ai-sales-coach` 的 HS256 桥接令牌。
- 陪练服务在 `AUTH_MODE=workbench` 下只接受该桥接令牌，并将工作台用户映射为陪练内部用户：工作台管理员映射为 `ADMIN`，其他获授权岗位映射为 `TRAINEE`。
- 直接打开陪练时不出现账号密码页，只显示“仅可从 Vigor 工作台打开”的入口提示。
- 陪练现有训练/模拟数据继续留在本应用 SQLite 中；新增映射用户使用 `workbench:<用户ID>@vigor.local`，不会与真实客户或 CRM 数据混淆。

### 管理员 API 接入中心

- 工作台左侧管理员导航新增 **API 接入**：`/admin/api-integrations`。
- 管理员可为每个已接入应用录入接口地址、启用状态、访问密钥。
- API 密钥只保存在 `/var/lib/vigor-workbench/integrations.json`（0600），前端及 API 列表仅返回“是否配置”与掩码，绝不回显原文。
- 首条登记项：`ai-sales-coach` → `/apps/ai-sales-coach/api`，已启用，未配置额外 API 密钥。
- BFF 增加：
  - `POST /api/auth/bridge`
  - `GET /api/admin/integrations`
  - `PUT /api/admin/integrations/:appId`

## 服务器变更与备份

- BFF：新增 `integrations.service.ts`，更新 config/controller/module/identity/main。
- 工作台：`src/App.tsx` 新增桥接 iframe 逻辑与 API 接入页面。
- 陪练：`apps/server/src/middleware/auth.ts`、`apps/web/src/stores/authStore.ts`、`apps/web/src/App.tsx`。
- 服务器备份目录：
  - `/opt/vigor-backups/api-bridge-20260812140918`
  - `/opt/vigor-backups/coach-auth-20260812141140`
- 已受控重启 `vigor-workbench-bff.service`，并以 PM2 `reload` 重载 `ai-sales-coach`；PM2 已保存进程清单。

## 验证结果

- 工作台 BFF 构建通过。
- 工作台前端生产构建通过。
- 陪练后端 TypeScript 构建通过。
- 陪练前端 Vite 生产构建通过。完整 `tsc` 仍有该项目原有的未使用变量/知识库类型告警；本次引入的 `React` 类型错误已修正。
- `GET http://127.0.0.1:4000/api/health` 成功。
- `GET http://127.0.0.1:3000/api/health` 成功。
- 端到端桥接：工作台管理员令牌成功读取陪练 `/api/auth/me`，返回内部映射管理员身份。
- API 接入写入和列表读取成功，未返回密钥原文。

## 下一步

1. 用同样的桥接协议让产品编码器、销售提成、企业知识库逐项接入；每次先确认各应用的动作级权限映射。
2. 将工作台当前浏览器 localStorage 演示账号迁移为 BFF 服务端账号存储与签名会话，才能使管理员权限不可被浏览器伪造。
3. 为 API 接入中心增加“轮换密钥”和操作审计；当前 HTTP 模式中密钥仍只能用于内测。
4. 接入 COS SDK、版本化对象键和下载授权；不使用 CloudBase。

