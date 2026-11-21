# 股份公司知识库 MCP 与 DSH 引用展示插件

为 **Harness 0.2.2-alpha.2 / DSH Desktop** 提供可复用的知识检索 MCP 服务和匠宝风格来源展示。模型仅接收文字与表格内容，不接收图片；图片由插件通过鉴权通道单独加载。

支持：`+` 菜单/`@` 选择“公司知识库”、按会话持续显示可移除来源标签、程序先检索再交给模型、模型自动检索，以及来源展开、切片全文、切片详情、HTML/GFM 表格、工程表达式保留、图片预览/放大/下载、内容复制、加载与失败状态、磁盘快照和图片缓存。

展示插件0.2.1已对照DSH主题、字体和紧凑控件尺寸调整，支持跟随浅色/深色及用户字号。检查结果和截图说明见 [界面适配检查](docs/界面适配检查.md)。

## 先看这里

- 本机无法访问公司内网。本项目提供合成演示模式和离线包；真实平台、内网模型及完整 DSH Desktop 联调必须在内网进行。
- 当前实现**只读知识检索与展示**，不执行公司工作流，不运行任意外部函数。工作流接入需要具体业务流程和中断样例，未作为已完成能力交付。
- 插件自带针对本服务的标准 MCP 客户端桥接，将模型输出与界面 `meta` 分开。**不要再同时配置同名通用 MCP 桥接，否则工具名称会冲突。**
- 图片在对应工具结果的“参考来源”中展示。不会自动把 DSH 原生回答里的普通 `[编号]` 改造成可点击的匠宝引用按钮。

## 内网快速安装

完整教程见 [docs/使用教程.md](docs/使用教程.md)。推荐复制 `offline/dsh-mcp-tbea-knowledge` 的全部内容到内网目录，包含 Node 运行时和已构建产物，不需要下载 npm 包，也不需要编译。

1. 初始化：`powershell -ExecutionPolicy Bypass -File .\scripts\Initialize.ps1`。
2. 启动服务：`powershell -ExecutionPolicy Bypass -File .\scripts\Start-Service.ps1`，保持窗口运行。
3. 打开 `http://127.0.0.1:17861/demo`，先验证来源、表格和图片。演示资料不可用于设计。
4. 从 DSH Desktop 托盘打开 **DSH Terminal**，进入本项目，运行 `powershell -ExecutionPolicy Bypass -File .\scripts\Install-Plugin.ps1`。
5. 从托盘完全退出并重新启动 DSH Desktop，保持知识服务运行。在输入框的 `+` 菜单选择“公司知识库”（也可输入 `@` 后选择），看到来源标签后提问。程序会先检索全部已登记知识库，再交给模型回答。
6. 验证后修改 `config/local.json` 为正式配置，重启知识服务及 DSH，再查询正式资料。

脚本仅为当前进程设置执行策略，不修改系统执行策略。若组织策略禁止脚本，请由管理员按内网规范执行。

## 开发命令

源码工程需要 Node.js >=24.9.0。依赖已下载到本项目的 `node_modules`；离线继续开发时需复制整个源码项目及 `node_modules`，保持 Windows x64 架构一致。

```powershell
npm ci                 # 仅在有网络或完整 npm 缓存时安装，离线运行包不需要
npm run build          # 构建 MCP、诊断工具及 DSH 插件
npm test               # 单元与真实 MCP 协议集成测试
npm run init           # 初始化配置，不覆盖已有配置
npm start              # 启动服务
npm run doctor         # 检查配置、健康接口及 MCP 握手；正式模式不自动发起检索
npm run pack:offline   # 生成不含凭证和聊天数据的 Windows 离线运行目录
```

## 目录与修改位置

| 目录 | 用途 |
| --- | --- |
| `src/platform.mjs` | AK/SK 签名、平台检索/详情、受限图片下载 |
| `src/normalize.mjs` | 切片图文分离、表格解析、模型文字投影 |
| `src/knowledge.mjs` | 工具定义、授权范围、去重、图片刷新 |
| `src/store.mjs` | 快照与图片持久化、磁盘配额 |
| `src/server.mjs` | 标准 Streamable HTTP MCP 与内部展示接口 |
| `plugin/src/host.mjs` | DSH MCP 桥接、工具输出/meta、鉴权 RPC |
| `plugin/src/selection.mjs` | 会话来源开关持久化、模型调用前强制检索 |
| `plugin/src/composer.mjs` | `+`/`@` 入口、来源界面状态、历史引用节点 |
| `plugin/src/client.jsx` | 来源、表格、图片及详情交互 |
| `plugin/src/style.css` | 插件样式，全部限制在 `tbea-` 类名下 |
| `config/local.json` | 单机管理员配置与凭证，初始化生成，不纳入版本管理 |
| `data` | 资料快照及已查看图片的缓存，需随历史数据迁移 |
| `docs/验证记录.md` | 已验证项目及内网待验证项目 |

## 已知边界

- 选中“公司知识库”时，每次新文字提问由程序先调用真实 MCP；失败或停止时不放行本次模型回答。未选中或取消后仍保留模型自动检索，是否调用由模型判断；取消标签不等于禁用工具。
- 来源选择按会话保存，直到手动取消；新会话默认不选中。已在进行中的检索不因移除标签而取消，需要使用 DSH 的停止按钮。
- 知识库目前通过 `config/local.json` 的 `knowledgeBases` 数组配置，没有管理界面。“全部知识库”仅指已登记且凭证获授权的知识库，不自动发现平台全部知识库。填写方法见 [知识库配置教程](docs/知识库配置.md)。
- 仅下载平台同源 HTTPS 的 PNG/JPEG/WebP/GIF；不执行原始 HTML，不跟随图片重定向。SVG/TIFF 等格式保留失败提示，后续需安全转换。
- 图片首次展开来源时下载并持久缓存。未打开就过期的链接会尝试刷新只读切片详情；平台不返回有效新链接时，显示错误与重试按钮，不保证所有图片永久可用。
- 达到缓存配额时明确报错，不静默删除历史数据。备份后由管理员清理或增加配额。
- 本服务仅监听 `127.0.0.1`，是个人验证方案。多人集中部署需另行增加可信身份、按用户授权、TLS 与审计，不能直接改为监听所有网卡。

技术依据：[固定版本工具展示接口](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/client/ui-tool/README.md)、[工具输出与 presentationMeta](https://github.com/deepseek-ai/deepseek-harness/blob/f3803c96974ad4a94195fb97e5c637e9c2a3afe3/packages/core/tools/src/contracts.ts)、[DSH Desktop 插件开发](https://github.com/anywhere-labs/dsh-desktop/blob/master/docs/plugin-development.md)。
