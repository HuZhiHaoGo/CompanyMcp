# DSH 公司知识展示插件

目标运行时：Harness **0.2.2-alpha.2**。本包无安装期依赖、无安装脚本，Host 与浏览器产物均已打包。

通过 `dsh.bundle.patch` 注册 Host 插件，通过 `dsh.client` 与 `./client` 注册浏览器插件。使用正式 `tool.call.toolview` keyed slot，不修改 DSH 内部组件，不依赖视觉模型。

包含两个工具：`mcp__tbea__search_knowledge`、`mcp__tbea__get_chunk_detail`。Host 使用标准 MCP 客户端连接知识服务，`output.render` 仅生成文字，`output.presentationMeta` 仅存放快照标识。展示层通过鉴权的 Connection RPC 获取图片，不向模型发送图像。

请先在整个项目根目录运行 `scripts/Initialize.ps1`，生成包含管理员配置绝对路径的 `cordis.patch.yml`，再从 DSH Terminal 安装本目录。移动项目后重新初始化和安装，或在当前 profile 中使用根目录生成的配置覆盖片段；不要直接覆盖整个 profile patch。

具体安装、正式配置和故障排查见项目根目录 `docs/使用教程.md`。
## 来源选择更新（0.2.0）

通过 `+` 菜单或 `@` 选择“公司知识库”，输入框上方显示可移除标签。同一会话持续选中，直到手动取消；新会话默认未选中。

选中时，Host 的 `agent/pre-step` 入口先通过真实 MCP 检索全部已登记知识库，再将文字证据交给模型；失败和取消时阻止本次入模。来源作为真实上下文记录持久化，使用 `conversation.chat.node` 展示，不伪造模型工具调用。

取消后仍保留模型自动检索。开关保存在项目 `data/dsh-selection`；库 ID 继续在 `config/local.json` 配置，填写方法见项目 `docs/知识库配置.md`。

