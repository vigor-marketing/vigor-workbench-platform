# 042 – 仓库归档路径迁移（Deepseek文件储存）

## 背景
另一个对话（19eacee7「整理v1文件到DeepSeek存储」）已将 /Volumes/v1 下项目文件全部归档整理：
- 项目仓库移入 `/Volumes/v1/Deepseek文件储存/数据/`（vigor-workbench-platform 等 19 个项目）。
- 对话记录归档至 `/Volumes/v1/Deepseek文件储存/对话记录/`（14 个对话 + 索引）。
- 部署包归档至 `/Volumes/v1/Deepseek文件储存/数据/部署包/`（21 个 tar.gz）。
- 交付文档移入 `/Volumes/v1/Deepseek文件储存/数据/文档/`（小程序接入工作台规范.md / .pdf）。
- 应用运行依赖（glm4v-mcp、pylib 等缓存）保留原位。

## 影响
- **工作台仓库新路径**：`/Volumes/v1/Deepseek文件储存/数据/vigor-workbench-platform`（原 `/Volumes/v1/vigor-workbench-platform` 已不存在）。
- 迁移后仓库完好：git HEAD = ebaaa9f（含小程序接入规范 + 对接代码示例），工作区干净。
- 后续所有代码/文档修改请使用新路径；远程 GitHub 不变。

## 校验
- 新路径 git log/status 正常；docs 下两份接入文档存在；交付清单与本 handoff 一致。
