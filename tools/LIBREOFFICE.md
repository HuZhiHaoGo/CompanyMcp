# LibreOffice 运行组件

管理员打包机使用 [LibreOffice 官方下载页](https://www.libreoffice.org/download/) 的 Windows x64 MSI。下载后从项目根目录运行：

```powershell
.\scripts\Prepare-LibreOffice.ps1 -MsiPath 'D:\Downloads\LibreOffice_Win_x86-64.msi'
npm run pack:offline
```

将命令中的路径换成实际 MSI。准备脚本校验签名，用 Windows Installer 的 `/a` 生成文件镜像，并把运行组件放进 `tools/libreoffice`。该目录包含组件许可证、通知以及带版本和 MSI SHA-256 的 `SOURCE.md`。升级 LibreOffice 前，把已有运行组件目录移走，再执行准备脚本。

完整 ZIP 位于 `offline/with-libreoffice/dsh-mcp-tbea-knowledge-win-x64.zip`。管理员从完整 ZIP 安装知识库插件，员工使用匠宝预览时无需运行 MSI。
