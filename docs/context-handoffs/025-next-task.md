# 025 — 销售小组隔离已部署并验证

更新时间：2026-08-14

## 当前任务状态

- 用户已确认实施销售小组级数据隔离：销售员、项目跟进员仅查看本组数据；销售组长查看并管理本组；销售经理、分管销售副总、总经理查看全部销售数据。
- 客户、商机、报价、合同、回款、项目统一继承所属销售小组。
- 跨组转移仅销售经理及以上岗位可执行，并应保留操作记录。
- 权限必须由 BFF 服务端强制执行；前端隐藏不作为安全边界。
- 销售小组级数据隔离已完成服务端实施、兼容迁移、构建、部署与角色矩阵验证。
- 账户管理已增加销售小组 ID/名称配置；会话 Actor 返回小组字段。
- 六类实体均增加 `teamId/teamName` 并沿业务链继承；现有演示链路已迁移至 `sales-team-1 / 销售一组`。
- 总经理、分管销售副总、销售经理全局可见；销售组长、销售员、项目跟进员仅本组可见且所有创建/流程动作均做服务端范围校验。
- 新增 `POST /api/sales/:entity/:id/team-transfer`；仅销售经理及以上可跨组转移，关联下游记录同步转组，并写入 `teamTransfers` 审计。
- 报价审批层级已部署：销售员报价仅由本组销售组长审批；销售组长报价由销售经理或分管销售副总审批；分管销售副总报价提交即自动通过并生成正式报价；总经理提交同样直接生效并保留全局审批权；销售经理自行报价由分管销售副总审批；项目跟进员不能创建或审批报价。
- 报价新增 `createdByRole/approvedByRole`，审批路径由 BFF 根据创建岗位、小组与审批岗位强制校验，不能审批本人报价。
- 合同用印闭环已部署：销售员发起申请 → 财务经理审批/驳回 → 会计执行并登记盖章；合同记录用印状态、盖章时间和经办人，用印申请保留三段审计。用印状态与 CI 确认完全独立，互不代替。
- 财务经理、会计已加入销售管理应用岗位权限，但 BFF 仅向其返回已审批报价、合同、用印申请和归档记录；客户、商机、回款、项目为空，且其他销售写入动作均拒绝。财务经理只能审批用印；会计只能登记盖章和纸质归档。
- 合同电子/纸质归档登记已部署：销售员登记电子合同文件名、版本、非敏感位置引用与时间；会计登记纸质归档编号、非敏感存放位置与时间；同一合同合并为一条归档记录并保留独立审计。当前只保存元数据，不接收或上传文件内容。
- 2026-08-14 全面审计修复：报价草稿现在仅允许创建人提交，组长/经理不能代销售员提交；销售台账仅在文件确实不存在（`ENOENT`）时初始化，JSON 损坏或其他读取错误会阻止服务启动并保留原文件，不再有静默清空风险。
- 销售管理八个岗位已明确持久化到 `/var/lib/vigor-workbench/app-permissions.json`，不再只依赖代码默认权限。
- 认证启动安全已加固：移除源码中的管理员预设密码回退；仅在用户文件不存在时读取 `BOOTSTRAP_ADMIN_PASSWORD`，且要求至少 12 位；变量未配置、用户文件损坏或其他读取异常时拒绝初始化并保留原文件。现有 `users.json` 与密码哈希未改变。
- 保留现有一套明确标记“系统验收演示（非真实）”的数据。

## 腾讯云资源与入口

- 腾讯云 CVM instance：`ins-59qdrwy7`。
- 地域：`ap-shanghai`（上海）。
- 工作台公网入口：`http://1.15.91.150/`。
- 销售管理入口：`http://1.15.91.150/workspace/apps/sales-management`。

## 服务器访问与授权状态

- 当前已知 SSH 主机：`1.15.91.150`。
- 正确登录用户：`ubuntu`（不是 `root`）。
- SSH 端口：默认端口 `22`。
- 当前未提供 SSH 主机别名；使用公网 IP 直连。
- 私钥文件引用：`/Users/monk/Downloads/cbs069791292101.pem`，文件权限已确认 `0600`。这里只记录本机路径引用，绝不复制私钥内容。
- RSA 指纹：`SHA256:uBIyjyhfbYZxpCYZD6/+OUt77whNhs0EnUIB2QauRIM`。
- 推荐连接：`ssh -i /Users/monk/Downloads/cbs069791292101.pem -o IdentitiesOnly=yes ubuntu@1.15.91.150`。
- 公钥授权状态：`ubuntu` 已获授权并实测可登录；服务器主机名 `VM-32-15-ubuntu`。
- `sudo -n` 已实测可用。
- 最近授权验证时间：2026-08-14 约 10:36–11:00（Asia/Shanghai）；本任务再次实测 SSH 登录、`sudo -n`、主机名均正常。
- 历史说明：此前 `root@1.15.91.150` 返回 `Permission denied (publickey)` 是登录用户错误，不代表 `ubuntu` 授权缺失。
- BFF 安全环境文件引用：`/etc/vigor-workbench/bff.env`，由 systemd drop-in `/etc/systemd/system/vigor-workbench-bff.service.d/10-environment.conf` 以可选 `EnvironmentFile` 引用。当前文件未创建，交接不得记录任何未来秘密值。
- 安全规则：绝不在聊天或普通交接文件中复制 SSH 私钥、密码、token。每次交付新对话前必须重新核对授权是否实际可用，不能只记录资源地址。

## 部署资源

- 工作台源码与部署目录：`/opt/vigor-workbench-pilot/app`。
- BFF systemd 服务：`vigor-workbench-bff.service`。
- BFF 监听：`localhost:4000`。
- Nginx 将 `/api/` 代理到 BFF。
- 销售前端组件：`/opt/vigor-workbench-pilot/app/src/components/SalesManagementPage.tsx`。
- 销售样式：`/opt/vigor-workbench-pilot/app/src/styles.css` 的 `Sales management` 块。
- 应用权限服务：`/opt/vigor-workbench-pilot/app/apps/bff/src/apps.service.ts`。
- 销售 BFF：`/opt/vigor-workbench-pilot/app/apps/bff/src/sales.service.ts`。
- 账户/Actor 小组字段：`/opt/vigor-workbench-pilot/app/apps/bff/src/auth.service.ts`、`/opt/vigor-workbench-pilot/app/apps/bff/src/types.ts`。
- 销售与账户 API：`/opt/vigor-workbench-pilot/app/apps/bff/src/app.controller.ts`。
- 账户管理前端：`/opt/vigor-workbench-pilot/app/src/App.tsx`、`/opt/vigor-workbench-pilot/app/src/lib/server-auth.ts`。

## 数据与文件

- 销售台账：`/var/lib/vigor-workbench/sales.json`，权限模式 `0600`。
- 应用权限持久化：`/var/lib/vigor-workbench/app-permissions.json`。
- 销售实体：客户、商机、报价、合同、回款、项目。
- 未来使用 COS 时，交接仅记录 bucket、region、prefix 和“凭据引用位置”，不得记录任何秘密值。
- 当前尚无已确认的 COS bucket、region、prefix 或凭据引用位置；不得猜测或编造。

## 应用权限与业务规则

- 可访问岗位：总经理、分管销售副总、销售经理、销售组长、销售员、项目跟进员；财务经理和会计仅为合同用印流程进入。
- 已确认的小组隔离规则见“当前任务状态”。
- 当前编号：`CUS`、`OPP`、`QTE`、`CON`、`PAY`、`PRJ` + 日期 + 顺序号。
- 当前销售台账 schema 已升级为 `version: 4`，包含 `sealApplications` 与 `contractArchives`；六类演示实体各 1 条且均属于 `sales-team-1 / 销售一组`，生产用印申请与归档记录均为 0 条，`teamTransfers` 0 条。
- 新增 API：`POST /api/sales/contracts/:id/seal-applications`、`POST /api/sales/seal-applications/:id/review`、`POST /api/sales/seal-applications/:id/execute`。
- 归档 API：`POST /api/sales/contracts/:id/archives/electronic`、`POST /api/sales/contracts/:id/archives/paper`。
- 报价审批通过后生成 `VIGOR-Q-...-V版本号`。
- 合同必须来自已审批报价。
- 项目必须来自 CI 已确认合同，并指定跟进员。
- 已确认的销售小组隔离、报价审批、用印和归档登记均已实施。未来真实电子文件上传仍需用户提供 COS bucket、region、prefix 与凭据引用位置后另行确认；HTTP/IP 内测期间禁止上传真实合同。

## 销售页面参考与 100% 缩放验收约束

- 用户于 2026-08-14 提供现有系统的四张销售页面截图，仅用于参考销售业务的信息架构与台账密度；不得照搬其整体视觉、侧边导航或销售以外模块。
- 可参考的销售能力：跟进记录、销售询价单、销售报价单、销售订单；Vigor 现有客户、商机、合同、回款、项目业务规则仍以本任务已确认规则为准，不能被参考系统反向覆盖。
- 可借鉴的交互结构：顶部关键词/归属/日期/高级筛选；紧凑列表或台账；状态、币种、等级等可扫读标签；点击编号进入详情；列表与详情分离；主要新建动作位置稳定。
- 视觉继续遵循统一工作台的黑色/红色、紧凑台账风格，不改成参考系统的蓝色主题，不恢复重复外层标题，不把四个业务子页重新堆叠成一个超长单页。
- “浏览器 100% 页面全面显示”的桌面验收含义：浏览器缩放为 100%，在 1920×1080 和 1440×900 可用视口下，页面标题/业务子页导航、核心筛选、主要新建动作、台账表头及首屏有效数据必须完整可见；不得出现整页横向滚动、关键按钮被裁切、固定高度造成内容不可达或浏览器缩放后布局错位。
- 宽表处理：按业务决策优先级固定关键列，次要字段进入详情抽屉/详情区或列设置；确需保留的宽表只能在台账容器内部横向滚动并保留关键列，不能让整个页面横向溢出。不得依靠缩小字号到不可读、强制浏览器缩放或把所有字段压进首屏来“全面显示”。
- 响应式最低要求：1024px 以上保持桌面工作台；768–1023px 压缩筛选并允许台账容器滚动；小于 768px 将筛选折叠、台账转摘要卡片或分段详情，核心创建、查看和流程动作不能被隐藏。
- 实施后的视觉验证必须在浏览器 100% 缩放下至少覆盖 1920×1080、1440×900、1366×768、1024×768，并检查长客户名、长编号、空状态、加载状态和权限受限状态。按桌面与窄屏做一次集中截图检查，修复后至多再确认一轮。
- 已补充 `681–1180px` 响应式规则：考虑固定侧边栏占用宽度，将销售双栏台账切换为单栏、创建区切换为纵向布局，避免 1024px 视口整页横向溢出。源码级检查确认台账容器使用 `overflow:auto`、表格容器 `min-width:0`，窄屏已有 680px 断点。
- 浏览器自动化通道无法加载该公网 IP（Chrome 扩展和应用内浏览器均超时），因此本轮没有完成真实截图级 100% 缩放验收；不得声称四个目标视口已视觉实测。站点在服务器本机经 Nginx返回 HTTP 200。后续浏览器通道恢复时仍需补做四视口截图验收。
- 2026-08-14 全面审计后再次使用应用内浏览器以 1440×900 打开公网根入口，仍在导航阶段超时；浏览器 kernel 随之重置，未进入登录页。四视口截图验收仍属于外部通道阻塞，不能标记完成。

## 运维与安全边界

- 不得停止、重启、修改或占用 AI 销售陪练 `3000` 服务。
- 当前为 HTTP/IP 内测环境，不得录入真实客户、合同、回款、证件、密钥或其他敏感数据。
- 不得对外暴露 BFF、数据库、COS 或 API 密钥。
- 用户要求重大业务变更逐项确认；不得擅自扩展到采购或财务写入。

## 验证、备份与恢复

- 最近一次已知状态来自 `024-next-task.md`：销售页面重做完成，前端与 BFF 构建成功，BFF 服务为 active；桌面实测可登录、读取演示台账并切换业务子页。
- 部署前备份：`/opt/vigor-workbench-pilot/backups/sales-team-isolation-20260814-105129`，包含修改前 BFF 源码、`App.tsx`、`server-auth.ts`、`styles.css`、`sales.json`、`users.json`；备份文件权限为 `0600`。
- 报价审批部署前备份：`/opt/vigor-workbench-pilot/backups/quote-approval-20260814-111238`，包含上一版 `sales.service.ts` 与生产 `sales.json`，权限为 `0600`。
- 合同用印部署前备份：`/opt/vigor-workbench-pilot/backups/contract-seal-20260814-112605`，包含 BFF 销售/路由/应用权限源码、销售页面、样式、`sales.json` 和 `app-permissions.json`，权限为 `0600`。
- 合同归档部署前备份：`/opt/vigor-workbench-pilot/backups/contract-archive-20260814-113322`，包含 BFF 销售/路由源码、销售页面、样式与 `sales.json`，权限为 `0600`。
- 全面审计修复前备份：`/opt/vigor-workbench-pilot/backups/sales-audit-fixes-20260814-121224`，包含 `sales.service.ts`、`app-permissions.json` 与生产 `sales.json`，权限为 `0600`。
- 认证加固前备份：`/opt/vigor-workbench-pilot/backups/auth-bootstrap-hardening-20260814-143839`，包含 `auth.service.ts`、`config.ts`、`users.json`、systemd 单元及已有 drop-in（如有），权限为 `0600`。
- 回滚方式：从上述目录恢复对应源码及数据文件，重新执行前端/BFF 构建，仅重启 `vigor-workbench-bff.service`；不得重启或修改 3000 服务。
- 角色矩阵临时副本测试通过：销售一组组长与跟进员可读迁移数据；销售二组销售员不可读一组数据；一组不可读二组新建数据；总经理可读全部；组长跨组转移被拒绝；销售经理转移成功且审计生成。临时测试文件已清理，未写入生产测试记录。
- 最近一次验证：2026-08-14 约 11:00（Asia/Shanghai）。前端 `tsc -b && vite build` 通过；BFF `tsc -p tsconfig.json` 通过；`vigor-workbench-bff.service` active；Nginx active；`GET localhost:4000/api/health` 返回 `status: ok`；Nginx `/` 返回 HTTP 200；BFF 仅监听 `127.0.0.1:4000`；TCP 3000 仍监听且未停止或修改。
- 报价审批最近验证：2026-08-14 11:14（Asia/Shanghai）。台账副本矩阵通过：销售经理不能审批销售员报价、其他组长不能跨组审批、本组组长审批成功、组长不能自审、销售经理可审批组长报价、组长不能审批经理报价、副总可审批经理报价、副总报价自动 approved 并生成正式编号、项目跟进员创建报价被拒绝。测试副本与脚本已清理；生产六类演示实体仍各 1 条，唯一报价仍 approved。
- 报价审批部署后 BFF 构建通过；`vigor-workbench-bff.service` active since 11:14:08 CST；Nginx active；健康接口正常；公网入口经 Nginx 返回 HTTP 200；BFF 仍仅监听 `127.0.0.1:4000`；TCP 3000 仍监听且未修改。
- 合同用印最近验证：2026-08-14 11:27（Asia/Shanghai）。前端与 BFF 构建通过；台账副本矩阵通过：销售员发起、销售经理审批被拒、销售员盖章被拒、财务经理销售写入被拒、财务经理审批成功、会计盖章成功、审计共 3 段、CI 保持未确认、财务窄视图不含客户、财务经理和会计均获用印入口。临时脚本和副本已清理。
- 用印部署后 `vigor-workbench-bff.service` active since 11:27:55 CST；Nginx active；健康接口正常；Nginx `/` 返回 HTTP 200；生产 `sales.json` 为 `version: 3`、`0600`、`sealApplications: 0`、六类演示实体各 1 条；BFF 仅监听 `127.0.0.1:4000`；TCP 3000 仍监听且未修改。
- 合同归档最近验证：2026-08-14 11:34（Asia/Shanghai）。前端与 BFF 构建通过；台账副本矩阵通过：销售员电子登记成功、销售经理电子登记被拒、财务经理纸质登记被拒、会计纸质登记成功、电子/纸质合并同一记录、审计 2 段、财务可读、没有上传实际文件。临时脚本和副本已清理。
- 归档部署后 `vigor-workbench-bff.service` active since 11:34:41 CST；Nginx active；健康接口正常；Nginx `/` 返回 HTTP 200；生产 `sales.json` 为 `version: 4`、`0600`、`contractArchives: 0`、`sealApplications: 0`、六类演示实体各 1 条；BFF 仅监听 `127.0.0.1:4000`；TCP 3000 仍监听且未修改。
- 全面审计最终结果：2026-08-14 12:13（Asia/Shanghai）。四套独立台账副本回归全部通过（小组隔离、报价审批、用印、归档）；前端与 BFF 重新构建通过；组长/经理代提交报价均被拒；损坏 JSON 初始化测试前后 SHA-256 完全一致；持久权限明确包含总经理、分管销售副总、销售经理、销售组长、销售员、项目跟进员、财务经理、会计。
- 审计修复后 `vigor-workbench-bff.service` active since 12:13:29 CST；Nginx active；健康接口与 Nginx `/` 正常；生产台账保持 `version: 4`、`0600`、六类演示实体各 1 条、用印/归档/转组审计均 0 条；BFF 仅监听 `127.0.0.1:4000`；TCP 3000 仍监听且未修改。
- 认证加固验证：2026-08-14 约 14:42（Asia/Shanghai）。现有用户文件在无启动密码变量时正常读取；用户文件缺失且变量未配置时拒绝初始化且不创建文件；损坏用户文件拒绝初始化且测试前后 SHA-256 一致；生产 `users.json` 与加固前备份 SHA-256 一致、权限 `0600 root:root`。
- 认证加固后 BFF 与 Nginx active，健康接口正常，Nginx `/` 返回 HTTP 200；systemd 已加载 `/etc/vigor-workbench/bff.env (ignore_errors=yes)` 引用；BFF 仍仅监听 `127.0.0.1:4000`，TCP 3000 仍监听且未修改。

## 后续执行顺序

1. 浏览器通道恢复后，补做 1920×1080、1440×900、1366×768、1024×768 的 100% 缩放截图验收。
2. 后续真实电子文件上传需等待 COS 资源与凭据引用位置明确，并由用户再次确认。
3. 接近上下文压缩时创建下一顺序号交接文件，并完整保留本文件中的授权与安全规范。

## 持久交接硬性规范

后续每份编号交接文件都必须完整保留并更新以下项目：腾讯云资源；SSH 主机/用户/端口/别名/公钥授权与当前 Codex 实测登录状态；部署资源；数据文件与 COS 非秘密引用；岗位、服务端权限、小组隔离、审批和未完成项；3000 服务及内测安全边界；构建、服务、健康检查、备份、回滚和最近验证结果。任何时候都不得在聊天或普通交接文件中记录私钥、密码、token 或秘密值。
