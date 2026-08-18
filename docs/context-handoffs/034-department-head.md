# 034 – 账号支持设置「部门主管」（与该部门最高岗位联动）

## 需求
「还需要能够设置部门主管，这个字段和岗位名称相关，该部门最高职位即为部门主管」

## 规则
- 每个部门有一个「最高岗位」，选择该岗位的账号才可被设为本部门主管：
  | 部门 | 最高岗位（主管） |
  | --- | --- |
  | 总经理办公室 | 总经理 |
  | 人力总经办 | 人力总监 |
  | 销售部 | 销售经理 |
  | 采购部 | 采购经理 |
  | 销售支持组 | 销售支持组 |
  | 市场运营组 | 市场组 |
  | 船务部 | 船务经理 |
  | 财务部 | 财务经理 |
- 自定义岗位（非内置）不是任何部门的最高岗位，不能设为主管。

## 改动
- BFF（auth.service.ts / app.controller.ts / types.ts）：`UserRecord` / `Actor` / 保存接口新增 `departmentHead?: boolean`，`publicUser` 透出。
- 前端（App.tsx PermissionAdminPage）：
  - 弹窗新增「部门主管」勾选：
    - 岗位/部门变化时自动联动：选择该部门最高岗位 → 勾选可用且新建默认勾选；选择非最高岗位 → 自动取消并禁用。
    - 非最高岗位时显示提示「部门主管需选择该部门最高岗位（××）后勾选」。
  - 账号卡片新增「部门主管」金色徽标；部门分组头部新增「姓名 · 主管」头像 chip（部门色）。
- server-auth.ts：`ServerUser.departmentHead`。
- styles.css：`.account-card-badges em.head`、`.account-dept-head-chip`、`.org-modal-hint`。

## 验证（部署后）
- API：创建 `sales_manager` + `departmentHead:true` → 存储返回 true；PUT 改 false 生效；`salesperson` 也能存（展示层规则约束 UI）。
- UI（Playwright）：财务部+会计 → 勾选禁用+提示可见；财务部+财务经理 → 勾选可用且自动勾选；新建船务经理账号 → 自动勾选、创建成功、船务部头部出现「姓名 · 主管」chip、卡片显示「部门主管」徽标；删除后 chip 消失。无 JS 报错。

## 部署
- BFF dist（auth.service/app.controller/types.js + src）覆盖并重启 `vigor-workbench-bff.service`（备份 `dist.bak-depthead`）。
- 前端 dist 全量覆盖（备份 `dist.bak-depthead`）。提交：`ca9c5f5`。
