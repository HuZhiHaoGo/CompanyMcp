# 股份公司知识库 MCP 与 DSH 引用展示插件

为 **匠宝 Harness 0.2.2-rc.1** 提供知识检索 MCP 服务和来源展示，同时保留对早期 Harness 0.2.2-alpha.2 的版本声明。模型读取切片正文和表格，图片由插件通过鉴权通道加载。

可通过 `+` 菜单或输入 `/` 选择「公司知识库」，也可以直接使用 `/公司知识库`。插件支持按会话持续显示可移除来源标签、程序先检索再交给模型、模型自动检索，以及来源展开、切片全文、切片详情、HTML/GFM 表格、工程表达式保留、图片预览/放大/下载、内容复制、加载与失败状态、磁盘快照和图片缓存。

0.11.5 在本地证据不足时，可复用匠宝会话里已确认的内网模型自动核对口语问法和切片，必要时改写并补检。新增授权知识库可以直接使用，无需维护同义词表。多国或多事项问题分别核对证据。 [语义复核和内网验收步骤](docs/使用与维护手册.md#检查检索证据与校准阈值)

左侧「知识库目录」可浏览授权库的文档、按名称筛选、查看基本信息和连续滚动原文。Windows x64 离线包附带 Poppler，启用原文预览即可预览 PDF。Word、PPT 等格式需要配置相应转换组件。 [配置和验收步骤](docs/使用与维护手册.md#知识库目录与原文预览)

会话顶部的「引用文档」汇总当前会话各轮的公司知识库文档。点击文档名打开原文，点击「查看引用」返回对应轮次。每轮的「参考来源」可展开切片、表格和图片。 [会话引用使用方法](docs/使用与维护手册.md#会话引用文档)

## 先看这里

- 本机无法访问公司内网。本项目提供合成演示模式和离线包；真实平台、内网模型及完整 DSH Desktop 联调必须在内网进行。
- 当前实现**只读知识检索与展示**，不执行公司工作流，不运行任意外部函数。工作流接入需要具体业务流程和中断样例，未作为已完成能力交付。
- 插件自带针对本服务的标准 MCP 客户端桥接，将模型输出与界面 `meta` 分开。**不要再同时配置同名通用 MCP 桥接，否则工具名称会冲突。**
- 图片在对应工具结果的“参考来源”中展示。不会自动把 DSH 原生回答里的普通 `[编号]` 改造成可点击的匠宝引用按钮。

## 内网快速安装

仅在内网使用时，复制 `offline/dsh-mcp-tbea-knowledge-win-x64.zip` 或同名已解包目录。继续在内网开发时，复制完整源码项目和现有 `node_modules`。 [选择迁移方式](docs/使用与维护手册.md#选择迁移方式) · [安装与升级](docs/使用与维护手册.md#安装与升级)

1. 从解压目录运行 `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Initialize.ps1 -Desktop -ConfigSource 'D:\配置\知识库.json'`，将示例路径换成管理员准备的 JSON。脚本将配置写入 `%APPDATA%\dsh-desktop\harness\dsh-mcp-tbea-knowledge.json`。
2. 在匠宝 `desktop` 的「插件管理」中选择解压包内的 `plugin` 目录安装并启用。匠宝将插件代码和 Poppler 一起安装，配置保留在 `harness` 根目录。
3. 关闭旧版手动服务，从托盘完全退出并重新打开匠宝。运行 `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Doctor.ps1 -Desktop` 检查版本、配置和 MCP 握手。
4. 在输入框通过 `/公司知识库` 选中知识库后提问。从左侧「知识库目录」打开文档，核对原文预览。

普通 Harness Profile 可在对应终端执行 `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install-Plugin.ps1 -Profile web`。独立 MCP 继续使用 `config/local.json`。 [升级、配置和排错](docs/使用与维护手册.md#安装与升级)

脚本仅为当前进程设置执行策略，不修改系统执行策略。若组织策略禁止脚本，请由管理员按内网规范执行。

## 开发命令

源码工程需要 Node.js >=24.9.0。依赖已下载到本项目的 `node_modules`，复制时保持 Windows x64 架构一致。附带 Node 的无 npm 构建方法、离线包验证和 ZIP 生成见 [内网开发与打包](docs/使用与维护手册.md#内网开发与打包)。

```powershell
npm ci                 # 仅在有网络或完整 npm 缓存时安装，离线运行包不需要
npm run typecheck      # 严格检查服务端和已迁移的插件 TypeScript
npm run build          # 类型检查后构建 MCP、诊断工具及 DSH 插件
npm test               # 单元与真实 MCP 协议集成测试
npm run init           # 初始化配置，不覆盖已有配置
npm start              # 启动服务
npm run doctor         # 检查配置、健康接口及 MCP 握手；正式模式不自动发起检索
npm run test:citations-ui # 用模拟会话验证原文预览和轮次跳转
npm run pack:offline   # 构建并刷新 Windows 离线运行目录及 ZIP
```

## 目录与修改位置

| 目录 | 用途 |
| --- | --- |
| `src/contracts.ts` | MCP 服务配置、引用、图表、快照结构 |
| `src/platform.ts` | AK/SK 签名、平台目录、检索与详情、受限图片下载 |
| `src/documents.ts`、`src/library-browser.ts` | 文档目录、游标续取、权限校验、临时预览 |
| `src/document-renderer.ts`、`src/preview-content.ts` | 文档转换、滚动预览页、静态网页归档处理 |
| `src/normalize.ts` | 切片图文分离、表格解析、模型文字投影 |
| `src/knowledge.ts` | 工具定义、授权范围、检索快照、详情与图片刷新 |
| `src/retrieval.ts` | 逐库检索、部分失败、跨库排序和证据去重 |
| `src/evidence.ts` | 算术题误触发拦截、主题和对象核对、部分证据识别 |
| `src/catalog-summary.ts` | 将授权目录转换为限长的主题摘要 |
| `src/store.ts` | 快照与图片持久化、磁盘配额 |
| `src/server.ts` | 标准 Streamable HTTP MCP 与内部展示接口 |
| `plugin/src/host.mjs` | DSH MCP 桥接、工具输出/meta、鉴权 RPC |
| `plugin/src/service-manager.mjs` | 自动启动、端口身份核对、共享实例及退出清理 |
| `src/runtime.ts` | 运行版本与鉴权后的配置身份 |
| `src/shared-tasks.ts` | 图片/切片任务去重与多窗口取消隔离 |
| `tsconfig.json` | 服务端和插件 TypeScript 检查配置 |
| `plugin/src/selection.mjs` | 会话来源开关持久化、模型调用前强制检索 |
| `plugin/src/composer.mjs` | `+` 菜单和 `/` 命令入口、来源界面状态、历史引用节点 |
| `plugin/src/client.jsx` | 来源、表格、图片及详情交互 |
| `plugin/src/cited-documents.ts`、`plugin/src/cited-documents-view.tsx` | 汇总会话引用和定位轮次 |
| `plugin/src/library-browser.tsx` | 左栏对应的目录页、文档元数据和连续预览 |
| `plugin/src/style.css` | 插件样式，全部限制在 `tbea-` 类名下 |
| `harness/dsh-mcp-tbea-knowledge.json`、`config/local.json` | 匠宝 `desktop` 与独立 MCP 的本机配置，由管理员初始化 |
| `data` | 资料快照及已查看图片的缓存，需随历史数据迁移 |
| `docs/使用与维护手册.md` | 安装、配置、使用、排错、卸载及验收 |

## 已知边界

- 选中“公司知识库”时，每次新文字提问由程序先调用 MCP。未选中时，`autoRetrieveKnowledge: true` 允许模型按需检索，设为 `false` 则仅在手动选中后检索。改配置后完全重启匠宝。 [设置按需查库或仅手动查库](docs/使用与维护手册.md#设置按需查库或仅手动查库)
- 来源选择按会话保存，直到手动取消；新会话默认不选中。已在进行中的检索不因移除标签而取消，需要使用 DSH 的停止按钮。
- 正式模式支持按项目自动发现目录。旧配置已有静态清单时继续限定到该范围，管理员可显式启用 `knowledgeDirectory.mode: auto`。内网 Postman 对照确认多库请求受 ID 顺序影响，因此 0.6.0 改为逐库调用。启用自动模式前请核对凭证可访问的项目范围。 [正式环境配置](docs/使用与维护手册.md#正式环境配置)
- 仅下载平台同源 HTTPS 的 PNG/JPEG/WebP/GIF；不执行原始 HTML，不跟随图片重定向。SVG/TIFF 等格式保留失败提示，后续需安全转换。
- 图片首次展开来源时下载并持久缓存。未打开就过期的链接会尝试刷新只读切片详情；平台不返回有效新链接时，显示错误与重试按钮，不保证所有图片永久可用。
- 达到缓存配额时明确报错，不静默删除历史数据。备份后由管理员清理或增加配额。
- 本服务仅监听 `127.0.0.1`，是个人验证方案。多人集中部署需另行增加可信身份、按用户授权、TLS 与审计，不能直接改为监听所有网卡。

技术依据：[固定版本工具展示接口](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/client/ui-tool/README.md)、[工具输出与 presentationMeta](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/src/contracts.ts)、[DSH Desktop 插件开发](https://github.com/anywhere-labs/dsh-desktop/blob/master/docs/plugin-development.md)。
