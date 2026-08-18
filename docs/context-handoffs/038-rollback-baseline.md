# 038 – 回滚到上上个版本（cf0431d 基线）

## 需求
「不对，先回滚到上上个版本」——撤销「组织管理」（035）与「账号字段」（037）两个方向。

## 回滚目标
- 源码恢复到 `cf0431d`（账号部门主管 + 市场运营组/销售支持组组长主管修复 之后、组织管理板块之前）。
- 即：**移除** 组织管理页、账号字段页、快捷标记（036）、组织架构图账号标记、roles.service、account-fields.service、org 重命名级联/删除保护、crown/layers 图标等 035/036/037 引入内容。
- **保留**：账号弹窗全部字段（账号/姓名/部门/小组/岗位/密码/管理员/停用 + 部门主管勾选，含组长主管规则）、侧边栏悬停、导航图标、弹窗样式等 032-034 功能。

## 操作
- `git checkout cf0431d -- apps/bff/src src`
- 删除 035/037 新增文件：roles.service.ts、account-fields.service.ts、OrgManagePage.tsx、AccountFieldsPage.tsx
- 校验：无 RolesService/account-fields/OrgManagePage/storeRoles/快捷标记 残留引用；BFF 与前端均构建通过。
- 导航恢复：个人账号 / 组织架构 / 账号与权限 / 岗位与权限 / 服务与授权 / 接入设置。

## 部署
- BFF dist（auth.service/app.controller/app.module/config.js + src）覆盖并重启；同时删除 dist 中遗留的 roles.service.js、account-fields.service.js。
- 前端 dist 全量覆盖。
- 清理 CVM 数据目录中已无用的 account-fields.json、roles.json。

## 备注
- 快捷标记（036，用户曾要求）也一并回滚；如后续需要可单独再加回。
- 提交：回滚 commit（见 git log）。
