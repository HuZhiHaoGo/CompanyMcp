# 管理员可选的外部 LibreOffice

普通 Profile 或独立 MCP 需要外部转换时，管理员可从 [LibreOffice 官方下载页](https://www.libreoffice.org/download/) 获取 Windows x64 MSI，再从项目根目录运行下列准备命令。

```powershell
.\scripts\Prepare-LibreOffice.ps1 -MsiPath 'D:\Downloads\LibreOffice_Win_x86-64.msi'
```

将命令中的路径换成实际 MSI。准备脚本校验签名，用 Windows Installer 的 `/a` 生成文件镜像，并把运行组件放进 `tools/libreoffice`。该目录包含组件许可证、通知以及带版本和 MSI SHA-256 的 `SOURCE.md`。升级 LibreOffice 前，把已有运行组件目录移走，再执行准备脚本。

在对应的知识库配置中，将 `documentPreview.office` 指向准备好的 `tools/libreoffice/program/soffice.com`。0.11.17 通用离线包独立构建，Word 和 PPT 在匠宝中优先使用内置服务。
