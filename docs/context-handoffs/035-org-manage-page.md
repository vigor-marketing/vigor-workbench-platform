# 035 – 独立「组织管理」板块（部门/小组/岗位的设置管理与删除）

## 需求
「需要有一个单独的板块进行部门，小组，岗位的设置管理和删除」

## 页面
- 新增导航项「组织管理」（管理员可见，位于组织架构之后），路由 `/admin/org-manage`，图标 `layers`。
- 三个标签页：部门 / 小组 / 岗位。

### 部门
- 新增部门（POST /api/org/departments）、行内重命名（PUT）、删除（DELETE）。
- 列表显示：部门色块、小组数、人数、账号数。
- 删除保护：有账号关联（`auth.countDepartmentUsers`）→ 拒绝；组织下有人 → 走 force 校验提示。
- 重命名级联：`auth.renameDepartment` 同步更新所有账号的 department 字段。

### 小组
- 先选部门，再新增/重命名/删除小组（POST/PUT/DELETE /api/org/teams）。
- 删除保护：有账号属于该小组 → 拒绝（`countTeamUsers`）。
- 重命名级联：`auth.renameTeam` 同步更新账号 teamName。

### 岗位
- 新增自定义岗位（新 BFF `RolesService`，存 `/var/lib/vigor-workbench/roles.json`，`config.roleFile`）。
- 列表：19 个系统内置岗位（只读，显示使用账号数）+ 自定义岗位（岗位库 + 账号中使用的岗位；岗位库中的可重命名/删除）。
- 删除保护：正在被账号使用 → 拒绝（`countRoleUsers`）。
- 重命名级联：`auth.renameRole` 同步更新账号 role。
- 岗位库中的岗位会合并进「账号与权限」弹窗的岗位下拉（PermissionAdminPage 加载 getServerRoles）。

## BFF 新增
- `roles.service.ts`（RolesService：list/add/rename/remove）。
- `app.module.ts` 注册 RolesService；`config.ts` 增加 roleFile。
- `app.controller.ts`：GET/POST/PUT/DELETE `/api/admin/roles`；org 部门/小组重命名接口返回 `updatedAccounts` 并级联；删除接口增加账号关联保护。
- `auth.service.ts`：`renameDepartment/renameTeam/renameRole`（级联）、`countDepartmentUsers/countTeamUsers/countRoleUsers`。

## 验证（部署后）
- API：岗位 add/rename/delete 正常；部门重命名返回 `updatedAccounts`；删除 销售部（组织有人）→ 400 提示。
- UI（Playwright）：导航出现「组织管理」；部门页 8 行、新增→重命名→删除临时部门全通过；小组页新增→删除临时小组通过；岗位页 19 内置 + 新增→删除临时岗位通过；岗位库新增「采购助理」后账号弹窗下拉可见；测试数据全部清理，org/roles 恢复原状。GLM 截图评审：三标签页样式统一、整齐美观。
- 无 JS 报错。

## 部署
- BFF：dist（auth.service/app.controller/app.module/config/roles.service/types.js + src）覆盖并重启 `vigor-workbench-bff.service`（备份 `dist.bak-orgmanage`）。
- 前端 dist 全量覆盖（备份 `dist.bak-orgmanage`）。提交：`ae66b64`。
