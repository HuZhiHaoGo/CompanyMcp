param([switch]$Manual)
. (Join-Path $PSScriptRoot 'common.ps1')
$Action = if ($Manual) { 'stop-manual' } else { 'stop-managed' }
& $NodeExe (Join-Path $ProjectRoot 'dist\service-control.mjs') $Action (Join-Path $ProjectRoot 'config\local.json')
if ($LASTEXITCODE -ne 0) { throw 'Knowledge MCP shutdown was not confirmed.' }
