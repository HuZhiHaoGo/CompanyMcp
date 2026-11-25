# 依赖与来源说明

本项目为公司内网适配代码，未声明对外开源授权。发布范围由项目所有者决定。

引用解析思路来自现有 AIStudio_Electron 项目；新增 DSH 适配按公开的 Harness 0.2.2-alpha.2 接口实现，未复制或分发整个 Harness 源码。

Excel 预览使用 SheetJS CE 0.20.3（Apache-2.0），PDF 查看使用 PDF.js（Apache-2.0）。构建使用 MCP TypeScript SDK（MIT）、parse5（MIT）、mdast/micromark 解析库（MIT）、React（MIT）、lucide-react（ISC）、esbuild（MIT）；确切版本见 package-lock.json，第三方许可证见构建产物中的许可注释及源码工程 node_modules 对应包。Windows 离线目录附带 Node.js；其许可证和第三方说明见 runtime/LICENSE。
