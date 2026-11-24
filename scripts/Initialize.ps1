param(
    [switch]$Desktop,
    [switch]$PrepareDesktopPackage,
    [string]$HarnessHome,
    [string]$ConfigSource,
    [switch]$ReplaceConfig
)
. (Join-Path $PSScriptRoot 'common.ps1')
$InitArguments = @()
if ($Desktop) { $InitArguments += '--desktop' }
if ($PrepareDesktopPackage) { $InitArguments += '--prepare-desktop-package' }
if ($HarnessHome) { $InitArguments += @('--harness-home', $HarnessHome) }
if ($ConfigSource) { $InitArguments += @('--config-source', $ConfigSource) }
if ($ReplaceConfig) { $InitArguments += '--replace-config' }
& $NodeExe (Join-Path $PSScriptRoot 'init.mjs') @InitArguments
if ($LASTEXITCODE -ne 0) { throw 'Initialization failed.' }
