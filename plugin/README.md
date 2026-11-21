# DSH 公司知识展示插件

目标运行时为匠宝 Harness **0.2.2-rc.1**，同时接受 **0.2.2-alpha.2**。Host 与浏览器产物均已打包。

通过 `dsh.bundle.patch` 注册 Host 插件，通过 `dsh.client` 与 `./client` 注册浏览器插件。使用正式 `tool.call.toolview` keyed slot，不修改 DSH 内部组件，不依赖视觉模型。

包含两个工具：`mcp__tbea__search_knowledge`、`mcp__tbea__get_chunk_detail`。Host 使用标准 MCP 客户端连接知识服务。`output.render` 输出文字证据，`output.presentationMeta` 存放快照标识、覆盖状态等展示字段。展示层通过 Connection 的同源鉴权接口获取图片。

匠宝管理员从离线包运行 `scripts/Initialize.ps1 -Desktop -ConfigSource <配置文件路径>` 后，在匠宝「插件管理」中安装离线包内的 `plugin` 目录。插件按 `DSH_HOME` 读取根目录中的 `dsh-mcp-tbea-knowledge.json`，并从自己的安装目录读取 Poppler。普通 Harness Profile 与旧版的显式 `configFile` 部署继续使用原有初始化方式。

具体安装、正式配置、故障排查和卸载见 [使用与维护手册](../docs/使用与维护手册.md)。

自动和手动检索使用同一套匹配规则。先查相关授权库，证据不足时扩大范围或用同义说法补查。结果区会说明优先检索的库数和未完成的范围。已授权的重复来源可在同一证据下展开，仍保留各自的切片 ID 和刷新操作。

匠宝托管服务可利用当前会话已确认的内网模型，自动复核员工口语和候选切片，并对必要的改写做一次补查。其他业务知识库走同一流程，同义词配置可作为补充。

会话顶部的「引用文档」汇总各轮的公司知识库文档，并标明「正文已引用」。点击文档名预览原文，点击「查看引用」回到对应轮次。每轮可从「参考来源」查看切片、表格和图片。回答正文里的知识库引用链接经对应轮次和权限校验后打开原文。

在 DSH 输入框输入 `/` 或点击 `+`，可从菜单选择「公司知识库」。输入 `/公司知识库` 后也可按回车选中。`@` 用于 DSH 原生引用。选中后，Host 通过 `agent/pre-step` 在模型回答前检索，会话节点 `conversation.chat.node` 显示来源。项目配置 `autoRetrieveKnowledge` 默认开启，未手动选中时由模型按需检索。设为 `false` 后 Host 不注册模型工具，手动预检索和来源展示仍由插件处理。MCP 默认随 Host 启动，会话开关保存在 `data/dsh-selection`。

按需查库时，Host 后台读取与检索共享的授权目录摘要，在有效期内附到模型的检索工具说明。目录暂不可用时使用通用工具说明。

