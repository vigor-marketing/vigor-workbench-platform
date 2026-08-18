# 037 – 新增「账号字段」页面（管理账号新增/修改弹窗的字段选项）

## 需求
「组织管理不对，人员和修改信息还是保持上一个版本，新增一个页面用来管理新增和修改里面的字段」
用户确认：**组织管理保留**（管理组织架构数据），另**新增「账号字段」页面**管理账号弹窗字段选项，与组织架构人员数据解耦。

## 方案
- 账号「新增/修改」弹窗的字段选项（部门下拉、小组下拉、岗位下拉、部门主管岗位规则）改由独立配置 `account-fields.json` 驱动（BFF 新 `AccountFieldsService`），**不再直接读 org.json**（组织架构人员数据保持上一个版本，不被字段管理影响）。
- 首次运行时从 org.json（部门/小组）+ roles.json（自定义岗位）+ 默认主管规则迁移生成。

## BFF
- `config.ts`：`accountFieldsFile`（默认 /var/lib/vigor-workbench/account-fields.json）。
- 新 `account-fields.service.ts`：get / save（校验：部门≥1、无重复、小组归属部门、岗位≤40字）/ addTeam / addRole。
- `app.controller.ts`：
  - GET /api/account-fields（管理员）。
  - PUT /api/account-fields：整份保存 + `renames` 数组（部门/小组/岗位重命名 → `auth.rename*` 级联同步账号）；删除保护（账号仍在使用中的部门/小组/岗位不允许移除）。
  - POST /api/account-fields/teams、POST /api/account-fields/roles（供账号弹窗内联新增）。

## 前端
- 新 `src/components/AccountFieldsPage.tsx`（路由 /admin/account-fields，导航「账号字段」在「账号与权限」之后，icon layers）：
  - 四段：部门选项 / 小组选项（按部门）/ 岗位选项（内置只读+自定义）/ 部门主管岗位规则（每部门下拉选择主管岗位）。
  - 本地编辑 + 一键「保存全部修改」（PUT 整份配置 + renames），重命名/删除有确认；未保存时有提示。
- 账号弹窗（PermissionAdminPage）改读 `getAccountFields()`：
  - 部门下拉 = config.departments；小组下拉 = config.teams[部门]；岗位下拉 = 内置 + config.customRoles + 账号中出现的自定义岗位。
  - 部门主管规则 = config.headRoles（回退内置默认表）。
  - 弹窗内联「新增小组/新增岗位」→ POST /api/account-fields/teams|roles。

## 验证（部署后）
- GET /api/account-fields 首次自动迁移：8 部门、销售部 V1–V5、8 条 headRoles（含 销售支持组组长/市场运营组组长）。
- UI 全链路（Playwright）：账号弹窗部门/小组/岗位下拉来自配置；字段页添加小组「资金组」+岗位「资金专员」+改财务部主管岗位为资金专员 → 保存 → 账号弹窗财务部小组出现资金组、会计勾选主管禁用、资金专员勾选主管可用；无 JS 报错。测试改动已清理还原（财务部恢复 finance_manager）。
- 组织架构图/选择器仍读 org.json，人员数据未受影响。

## 部署
- BFF：dist（account-fields.service/app.controller/app.module/config.js + src）覆盖并重启 `vigor-workbench-bff.service`（备份 `dist.bak-accountfields`）。
- 前端 dist 全量覆盖（备份 `dist.bak-accountfields`）。提交：`ca2cb4e`。
