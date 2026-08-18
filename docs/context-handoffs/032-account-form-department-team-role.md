# 032 – 账号新建/编辑：新增岗位、部门下拉、小组下拉与新增小组

## 需求
「新增和修改账号需要能够增加新的岗位，还需要新增的部门字段同时部门下拉可选，销售小组名称和新增的部门字段需要直接选择现有的小组，也需要新增小组，删除销售小组id字段，密码先默认填写」

## 改动

### BFF（apps/bff）
- `auth.service.ts`：
  - `UserRecord.role` 放宽为 `string`（支持自定义岗位）；`publicUser` 对未知岗位回退 `organizationScope: '按管理员配置的岗位范围访问'`（返回类型 `PublicUser = Actor & { username; disabled }`）。
  - `saveUser` 岗位校验放宽：非空且 ≤40 字符即可（不再限定 19 个内置岗位）。
  - 新增 `department` 字段（存储、透传）。
  - **销售小组 ID 自动推导**：`department==='销售部'` 且小组名匹配 `V{n}` → `teamId = sales-v{n}`（保持销售数据隔离 `sales.service.ts` 的 `canAccess/assertSales` 依赖），其余部门无需 teamId；移除「ID/名称必须同时填写」校验。
- `app.controller.ts`：admin/users PUT/POST body 增加 `department?: string`。
- `types.ts`：`Actor` 增加 `department?: string`。

### 前端（src）
- `lib/server-auth.ts`：`ServerUser.department`；新增 `getOrgTree()`（GET /api/org/tree）与 `addOrgTeam(department, team)`（POST /api/org/teams，管理员）。
- `App.tsx PermissionAdminPage`：
  - 弹窗字段：账号 / 姓名 / **部门（下拉，8 个部门，来自 org）** / **销售小组（下拉：所选部门已有小组 + 「＋ 新增小组…」行内输入，调 org/teams 新建并回显）** / **岗位（内置 19 个 + 账号中已出现的自定义岗位 + 「＋ 新增岗位…」行内输入）** / 密码（新建默认预填 `Vigor@2026`，编辑留空不修改）/ 管理员 / 停用账号。
  - **删除「销售小组 ID」输入框**。
  - 账号分组优先使用 `user.department`，无则按岗位回退推导（ROLE_DEPT）。
  - 保存负载不含 teamId（后端自动推导）；停用/启用透传 department+teamName。
  - 修复：新增岗位后下拉回显（`allRoleOptions` 含当前草稿岗位，避免 HTML5 required 拦截提交）。
- `styles.css`：新增 `.org-modal-inline-add`（行内新增输入 + 按钮）。

## 验证（部署后）
- API：新增小组 V6(测试组) → 自定义岗位「培训专员」建号（scope 回退正常）→ 销售部 V6 建号自动得到 `teamId: sales-v6` → PUT 改部门/岗位生效 → 自定义岗位账号可登录 → 全部清理。
- UI（Playwright，admin 登录）：
  - 部门下拉 8 项；销售部小组下拉 V1–V5 + 「＋ 新增小组…」；岗位下拉 19 内置 + 「＋ 新增岗位…」；密码预填 `Vigor@2026`；无 teamId 输入框。
  - 完整流程：新增小组 V7(测试新组) → 添加后自动选中；新增岗位「培训专员」→ 确定后回显；创建账号成功 → 卡片显示「培训专员/已启用」，销售部出现 V7 小组分组。
  - 无 JS 报错。测试数据（testui1、V6/V7 小组）已全部删除，org 恢复原状。

## 部署
- BFF：`apps/bff/dist/{auth.service,app.controller,types}.js`（+src .ts）覆盖 `/opt/vigor-workbench-pilot/app/apps/bff/`，重启 `vigor-workbench-bff.service`（备份 `dist.bak-accountform`）。
- 前端：dist 全量覆盖 `/opt/vigor-workbench-pilot/app/dist`（备份 `dist.bak-accountform`）。提交：`1fe41a6`（功能）、`163c98b`（岗位回显修复）。

## 备注
- 自定义岗位显示：卡片/下拉均直接显示岗位名（如「培训专员」）；数据范围回退文案「按管理员配置的岗位范围访问」；销售模块仍仅内置岗位可访问（salesRoles 集合不变）。
- 新增小组会真实写入 org.json（组织架构图/人员选择器同步可见），删除需走管理 API（DELETE /api/org/teams?force=true）。
