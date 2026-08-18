# 036 – 账号卡片直接标注「部门主管/管理员」+ 全平台数据同步

## 需求
「需要有一个可以直接标注部门主管的标记和标记管理员，所有的相关数据需要在更新之后同步」

## 改动
- **账号与权限 · 账号卡片**（src/App.tsx PermissionAdminPage）：
  - 卡片操作区顶部新增两个快捷标记图标按钮：
    - 👑 皇冠（crown 新图标）= 部门主管：一键设为/取消部门主管；非该部门最高岗位的账号按钮禁用（tooltip 提示）；已标记金色高亮。
    - 🛡 盾牌 = 管理员：一键设为/取消管理员；已标记红色高亮。
  - 新增 `toggleHead` / `toggleAdmin`：直接调 PUT /api/admin/users 保存并刷新；设主管时若账号无 department 字段自动回填（按岗位推导的部门）。
- **组织架构图同步**（src/components/OrgChartPage.tsx）：
  - 加载账号列表（getServerUsers），按 `username === 人员id` 关联。
  - 人员卡片显示同步的「主管」（金）/「管理员」（红）小标记；部门负责人 chip 也叠加「主管」标记。
  - 因此账号页标记更新后，组织架构图刷新即同步（同一后端数据源）。
- Icon.tsx 新增 `crown`；styles.css 新增 `.account-card-marks`（含 active 金色/红色态）、`.org-person-marks`、`.org-head-account`。

## 同步链路
标记 → PUT /api/admin/users（持久化 users.json）→ 账号页 refresh() 刷新卡片徽标 + 部门头「姓名·主管」chip；组织架构页 getServerUsers 重新拉取 → 人员标记同步。修改后无需手工刷新其他页面数据源。

## 验证（部署后）
- Playwright：刘斌（销售支持组普通岗）皇冠禁用；管理员标记点击后 active 且 API 持久化 isAdmin=true（已恢复）；张菲（销售支持组组长）皇冠可用且 active；组织架构图显示 2 个「主管」标记（张菲/陈炳屾），张菲 chip 带「主管」。
- GLM 截图评审：卡片皇冠金色高亮、管理员盾牌存在、布局整齐无错位、卡片「部门主管」徽标正常。
- 无 JS 报错；测试标记已还原。

## 部署
- 仅前端：dist 全量覆盖 `/opt/vigor-workbench-pilot/app/dist`，无需重启 BFF。提交：`a2fc2ac`。
