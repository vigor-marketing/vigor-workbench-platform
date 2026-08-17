# 028 — CAD/3D 方向确认；截图验收完成；三应用内测隔离入口上线

更新时间：2026-08-17

## 本轮完成

### 采购 CAD/3D AI 助手（保持计划模式，未写代码）
- 零件类型：暂不锁定，先做单类零件概念验证（POC）；
- 输出格式：先只做在线预览，导出格式（STEP/STL/GLTF/图纸）验证后再定；
- 审核人：采购经理；
- 精度要求：验证后再定，不预先锁定公差。

### 认证后多视口截图验收（已完成）
- 方式：本地 Vite 前端 + Playwright（完整 Chromium 无头）+ mock API（不接触真实凭据与真实数据）。
- 视口：1920×1080、2560×1600、3440×1440（21:9）、768×1024（平板）、390×844（手机）。
- 结果：45 屏认证页 + 9 屏交互态（销售 3 子视图、抽屉展开、通知面板）横向溢出与容器内裁切均为 0。唯一越界项为 ≤960px 收起在画布外的抽屉侧栏（预期行为）。

### 三应用「内测隔离入口」（已实现并部署到 CVM）
- BFF `app.controller.ts` 内部 `app-access`/`app-context` 端点：先走真实会话；无会话时**仅在 `DEMO_MODE=true` 且显式携带 `X-Demo-Role` 头**时回退到演示角色，否则沿用原 401。
- `Actor` 增加可选 `isAdmin`；`actorFromDemoRole` 对 `general_manager` 标记管理员。
- Nginx：`deploy/nginx/vigor-workbench.conf`（已版本化）在 `__workbench_access`/`__workbench_context` 子请求中转发了 `X-Demo-Role`。
- 已按「先 GitHub 再部署」部署：备份原 conf 与 3 个 dist 文件 → 更新 Nginx 与 BFF → `nginx -t` 通过 → reload + 重启 BFF。
- 验证：`/apps/{product-encoder,sales-commission,knowledge-base}/` 带 `X-Demo-Role: general_manager` 均 200，不带则 401（隔离生效）。

### 三个应用响应式验收（用隔离入口，只读）
- `product-encoder`（Vigor 编码器）：5 视口 0 溢出、0 裁切。
- `knowledge-base`（企业知识库）：5 视口 0 溢出、0 裁切。
- `sales-commission`（销售提成计算系统）：**平板 768 溢出（sw=817）、手机 390 溢出（sw=805）、桌面 3 视口各 1 处容器内裁切**。溢出元凶为一个无 class 的 `span`（疑似长数字/编号不换行）。该应用为独立业务系统，按其独立维护任务处理，不在本仓库修改。

## 本轮发现并修复的 install 回归（由 sync 提交引入）
1. `pnpm-workspace.yaml` 丢失 `packages: - apps/*` → 已恢复。
2. `pnpm-lock.yaml` 残留 `tencentcloud-sdk-nodejs@4.1.286`（`apps/bff/package.json` 已不含）→ 已重生成 lockfile 移除残留。

## 已知验证边界
- 本会话模型不支持图像输入，且仅配置了 DeepSeek（纯文本）凭据，**无可用图像通道**，故截图验收采用「横向溢出 + 容器内裁切」程序化指标，未做像素级人工复核。55+ 张截图已落盘（`/Volumes/v1/vigor-shots*`），需具备图像能力的通道复核。

## 下一项建议
1. 由具备图像能力的通道对截图做像素级人工复核。
2. 向销售提成（sales-commission）独立维护任务反馈：平板/手机横向溢出 + 桌面容器裁切。
3. CAD/3D 助手进入 POC 前，先确认概念验证的具体零件对象与验收标准。

## 固定边界
- 不停止或修改 AI 销售陪练 3000 服务。
- HTTP/IP 仅内测，不录入真实敏感经营数据、图纸、账号或密钥。
- 所有修改先提交并推送到 GitHub，确认 main 更新后再部署 CVM。
- 不在聊天、代码、日志或交接文件中暴露 BFF、数据库、COS、API 或 SSH 私钥内容。
- 重大业务变更继续逐项确认。
