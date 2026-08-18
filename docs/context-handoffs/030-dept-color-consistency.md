# 030 – 账号与权限部门配色与组织架构图保持一致

## 需求
「不同部门的颜色需要和组织架构保持一致」。

## 做法
- 将 `DEPT_COLORS` 从 `src/components/OrgChartPage.tsx` 提升为共享常量，放入 `src/data/workbench.ts`（导出）。
- `OrgChartPage.tsx`：删除本地重复定义，改为 `import { DEPT_COLORS } from '../data/workbench'`（单一定义源，杜绝两页漂移）。
- `src/App.tsx`（PermissionAdminPage）：
  - `.account-dept-mark` 增加行内 `background: DEPT_COLORS[dept] || '#15202c'`；
  - `.account-dept` 卡片增加行内 `borderTop: 3px solid <accent>`，与组织架构图的 `.org-dept-block` 顶部强调条一致。
- 8 个部门配色：总经理办公室 #b45309 / 人力总经办 #0d9488 / 销售部 #2563eb / 采购部 #16a34a / 销售支持组 #7c3aed / 市场运营组 #ea580c / 船务部 #0891b2 / 财务部 #e11d48；`其他` 分组回退 #15202c。
- 提交：`2d149f3`（已 push）。

## 验证（部署后）
- Playwright 实测两页每个部门的 `.org-dept-mark` 与 `.account-dept-mark` 背景色完全一致，且两页卡片均为 3px 同色顶部强调条；无 JS 报错。
- GLM-4V 截图评审：部门顶部强调条与小方块标记颜色一致，页面整洁无错位。

## 部署
- 前端 dist 全量替换 `/opt/vigor-workbench-pilot/app/dist`（备份 `dist.bak-deptcolor`），index.html 指向 index-BMm1AChM.js。无需重启 BFF/nginx。
