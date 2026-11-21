# DSH 公司知识展示插件

目标运行时为匠宝 Harness **0.2.2-rc.1**，同时接受 **0.2.2-alpha.2**。Host 与浏览器产物均已打包。

通过 `dsh.bundle.patch` 注册 Host 插件，通过 `dsh.client` 与 `./client` 注册浏览器插件。使用正式 `tool.call.toolview` keyed slot，不修改 DSH 内部组件，不依赖视觉模型。

包含两个工具：`mcp__tbea__search_knowledge`、`mcp__tbea__get_chunk_detail`。Host 使用标准 MCP 客户端连接知识服务。`output.render` 输出文字证据，`output.presentationMeta` 存放快照标识、覆盖状态等展示字段。展示层通过 Connection 的同源鉴权接口获取图片。

请先在整个项目根目录运行 `scripts/Initialize.ps1`，生成包含管理员配置绝对路径的 `cordis.patch.yml`，再从 DSH Terminal 安装本目录。移动项目后重新初始化和安装，或在当前 profile 中使用根目录生成的配置覆盖片段；不要直接覆盖整个 profile patch。

具体安装、正式配置、故障排查和卸载见 [使用与维护手册](../docs/使用与维护手册.md)。

自动和强制检索共享 MCP 的逐库检索策略。检索范围不完整时展示已完成库数，已授权的重复来源可在同一证据下展开。其他来源仍有独立切片 ID 和刷新操作。

在 DSH 输入框输入 `/` 或点击 `+`，可从菜单选择「公司知识库」。输入 `/公司知识库` 后也可按回车选中。`@` 用于 DSH 原生引用。选中后，Host 通过 `agent/pre-step` 在模型回答前检索，会话节点 `conversation.chat.node` 显示来源。项目配置 `autoRetrieveKnowledge` 默认开启，未手动选中时由模型按需检索。设为 `false` 后 Host 不注册模型工具，手动预检索和来源展示仍由插件处理。MCP 默认随 Host 启动，会话开关保存在 `data/dsh-selection`。

按需查库时，Host 后台读取与检索共享的授权目录摘要，在有效期内附到模型的检索工具说明。目录暂不可用时使用通用工具说明。

