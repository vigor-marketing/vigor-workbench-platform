
> **归档约定（2026-08-18 起生效）**：本应用产生的所有文件必须存放在 `/Volumes/v1/Deepseek文件储存/` 下，禁止放 `/Volumes/v1` 根目录。归类：项目代码 → `数据/`、部署包 → `数据/部署包/`、文档 → `数据/文档/`、对话上传与记录 → `对话记录/`；应用运行依赖（glm4v-mcp、pylib、WorkBuddy数据储存）保留原位。
> **仓库路径（2026-08-18 归档后）**：`/Volumes/v1/Deepseek文件储存/数据/vigor-workbench-platform`（原 `/Volumes/v1/vigor-workbench-platform` 已迁移，勿用旧路径）。远程 `git@github.com:vigor-marketing/vigor-workbench-platform.git`。
# 统一工作台｜项目长期记忆

最后更新：2026-08-17

## 不可变业务与架构规则

- 工作台先接入销售 AI 陪练、采购产品编码、财务销售提成三个现有应用；按销售、采购、财务顺序分类。
- 生产接入使用工作台同域 Nginx 反向代理 `/apps/{app-id}/`；不得以 GitHub 页面 iframe 嵌入。
- 小程序各自拥有业务库；工作台只能通过模块 API 和版本化事件联通，不跨库直接写入。
- 工作台待办需实时更新；转交须审批；逾期标红并通知负责人、发起人、小组长与对应副总经理。
- 总经理及两位副总经理可查看全部经营数据；销售副总与总经理可查看销售明细；小组长只看本组数据。
- 生产 BFF 必须使用 OIDC；`X-Demo-Role` 仅可用于 `DEMO_MODE=true` 的本地演示。

## 安全与腾讯云规则

- 腾讯云密钥、数据库密码和证书不得写入项目、Git、交接文件、普通日志或对话；数据库密码仅保存在本机钥匙串。
- 腾讯云 PostgreSQL 公网入口必须保持关闭。若复用 CloudBase PostgreSQL，则 BFF 通过 CloudBase `ExecutePGSql` 管理接口、以专用数据库角色访问，不开放数据库端口；若使用腾讯云 PostgreSQL，则通过同 VPC 私网或受限 SSH 隧道访问。
- PostgreSQL TLS 已启用；BFF 生产连接须校验 CA 与服务器名称，禁止用 `rejectUnauthorized=false` 作为常规方案。
- 用户确认复用现有上海 CloudBase PostgreSQL 环境，不新建收费环境。工作台数据隔离在默认 `postgres` 库的 `workbench` schema；不得读取或修改销售提成数据。CloudBase 管理 API 固定操作默认库，不能将第二数据库作为 BFF 的运行时存储。
- CloudBase BFF 必须设置 `TODO_STORAGE=cloudbase-pg`、环境 ID 与专用 PG role；腾讯云 API 凭据只能通过 CloudBase 运行时密钥变量或本机临时环境变量提供，严禁写入仓库。
- 用户最新确认：工作台后续改用现有腾讯云 CVM 部署，不再以 CloudBase 作为工作台运行时；CloudBase 仅保留给既有应用。
- CVM 当前可用于内测部署：Ubuntu 26.04，2 vCPU/4 GB RAM/80 GB 磁盘，Docker 29 与 Docker Compose 2 已安装；根分区约 61 GB 可用，约 1.9 GB 内存可用，已有 6 GB swap，当前无 Docker 容器。不得占用 3000 端口。
- 已发现既有 Node 服务监听公网 3000，防火墙也允许 3000；不得停掉、改写或关闭该服务/端口，除非用户逐项确认。工作台应使用容器内部端口并由反向代理统一暴露 80/443；PostgreSQL 不暴露公网。

## Git 与部署流程规则（2026-08-17 起强制执行）

- 所有代码/文档修改必须**先提交并推送到 GitHub**，确认远端 `main` 已更新后，**再部署到 CVM**。禁止先改线上再回填仓库（此前曾出现 CVM 代码领先于仓库的脱节，已修复）。
- GitHub 是唯一事实来源；CVM 只承载由仓库部署出来的产物。任何对话在修改任一仓库前，先 `git pull` 同步最新。
- 每个仓库独立提交、独立推送；一个仓库的改动不触碰其他仓库。跨仓库联动（如工作台嵌入地址变更）需在各自仓库分别提交并说明关联。
- 提交前必须自查：不提交 `node_modules`/`dist`/`.env*`/密钥/私钥/密码/令牌；`.env.production` 与真实凭据只存在于 CVM 的 0600 文件，绝不进 Git。
- 部署动作（scp/rsync/重建/重启服务）与 Git 推送分开；先推送成功，再执行部署。
- 部署锚点（仅引用，不复制私钥）：CVM `ins-59qdrwy7`（ap-shanghai），入口 `http://1.15.91.150/`；SSH `ubuntu@1.15.91.150` + 本机密钥 `/Users/monk/Downloads/cbs069791292101.pem`。

## 连续对话协议

1. 每一轮续接使用三位递增编号：`001`、`002`、`003`……
2. 每次即将自动压缩或完成一个长任务阶段前，先更新当前编号的交接文件：需求、决策、文件轨迹、验证结果、风险、下一步必须完整保留。
3. 接着创建同目录续接对话，将其标题和续接任务标为下一个编号，并把对应 `NNN-next-task.md` 的内容发送到新对话。
4. 新对话先读取 `000-project-memory.md`、`INDEX.md` 和上一轮交接文件，之后才执行任务。
5. 若系统没有创建对话能力，则仍先写完整交接；当前环境已确认支持同目录续接对话创建。
