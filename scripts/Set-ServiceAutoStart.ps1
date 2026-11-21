param([Parameter(Mandatory)][ValidateSet('Enable','Disable')][string]$Mode)
. (Join-Path $PSScriptRoot 'common.ps1')
$Action = $Mode.ToLowerInvariant() + '-auto-start'
& $NodeExe (Join-Path $ProjectRoot 'dist\service-control.mjs') $Action (Join-Path $ProjectRoot 'config\local.json')
if ($LASTEXITCODE -ne 0) { throw 'Could not update Knowledge MCP auto-start.' }
