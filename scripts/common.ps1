$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$NodeExe = Join-Path $ProjectRoot 'runtime\node.exe'
if (-not (Test-Path -LiteralPath $NodeExe)) { $NodeExe = Join-Path $ProjectRoot 'offline\0.11.15\dsh-mcp-tbea-knowledge\runtime\node.exe' }
if (-not (Test-Path -LiteralPath $NodeExe)) { $NodeExe = Join-Path $ProjectRoot 'offline\dsh-mcp-tbea-knowledge\runtime\node.exe' }
if (-not (Test-Path -LiteralPath $NodeExe)) { $NodeExe = (Get-Command node -ErrorAction Stop).Source }
$NodeVersion = & $NodeExe -p "process.versions.node"
if ([version]$NodeVersion -lt [version]'24.9.0') { throw 'Node.js 24.9.0 or newer is required.' }
