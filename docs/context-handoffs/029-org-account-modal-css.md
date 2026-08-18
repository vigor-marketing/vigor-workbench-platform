# 029 – 账号新建/编辑弹窗缺少弹出样式（补全）

## 问题
用户反馈「新建/编辑账号 = 弹出小框 功能未实现」。

## 根因
- `56985a4` 已在 `src/App.tsx` 的 `PermissionAdminPage` 中加入了 `.org-modal-backdrop` / `.org-modal` 弹窗结构（新增/编辑共用），但 `src/styles.css` 中只写了内部字段样式（`.org-modal-fields select`、`.org-modal-checks*`），**核心的遮罩层与小框定位/外观样式缺失**。
- 结果：弹窗在 DOM 中存在但无样式，渲染为页面底部普通内联内容，视觉上「没有弹出小框」。Playwright 验证：`.org-modal` 存在但截图不可见（GLM-4V 确认页面无弹窗）。

## 修复
- `src/styles.css`：在 `.org-modal-checks input` 之后补全：
  - `.org-modal-backdrop`：`position:fixed; inset:0; z-index:100` + 半透明深色遮罩 + `backdrop-filter: blur(3px)`，`display:grid; place-items:center`。
  - `.org-modal`：`width:min(460px, calc(100vw - 32px))`、圆角 14px、投影、入场动画 `org-modal-pop`。
  - `.org-modal h3`（标题+下边框）、`.org-modal-fields label/input`（与全站 `.password-form input` 一致的表单风格 + 红色 focus 描边）、`.org-modal-actions`（右对齐 + 主按钮深色）。
- 提交：`c239abc`（仅 styles.css，+34 行），已 push `main`。

## 验证（部署后，http://1.15.91.150/）
- Playwright（系统 Chrome）以 `erica` / `Vigor@2026` 登录 → 账号与权限：
  - 点击「新增账号」→ `.org-modal` 可见，遮罩覆盖全屏，小框居中（1440×900 下 box: x=490, y=112.5, w=460）。
  - 点击「编辑」→ 弹窗标题「编辑账号」。
  - 无页面 JS 错误。
- GLM-4V 截图评审：居中弹出小窗、半透明遮罩、全部字段、底部按钮、无错位/溢出/重叠，样式美观。

## 部署
- 前端 dist 全量替换 `/opt/vigor-workbench-pilot/app/dist`（备份 `dist.bak-orgmodal`），index.html 已指向新 hash 资源（index-MvWOYu2a.js / index-tAALn4kx.css）。无需重启 BFF/nginx。

## 备注
- `admin` 密码已于 031 重置为 `Vigor@2026`（与 49 个种子账号一致），可用 admin / Vigor@2026 直接登录。
