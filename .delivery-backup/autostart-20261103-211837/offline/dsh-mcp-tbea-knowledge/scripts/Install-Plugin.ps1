param([string]$Profile = '')
. (Join-Path $PSScriptRoot 'common.ps1')
& $NodeExe (Join-Path $PSScriptRoot 'init.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Initialization failed.' }
$Dsh = Get-Command dsh -ErrorAction SilentlyContinue
if (-not $Dsh) { throw 'Open DSH Terminal from the DSH Desktop tray, then run this script again.' }
$InstallArgs = @('plugin')
if ($Profile) { $InstallArgs += @('--profile', $Profile) }
$InstallArgs += @('add', (Join-Path $ProjectRoot 'plugin'), '--offline', '--ignore-scripts')
& $Dsh.Source @InstallArgs
if ($LASTEXITCODE -ne 0) { throw 'Offline plugin installation failed. Do not remove --offline; check the DSH profile and its dependency cache.' }
Write-Host 'Plugin installed. Fully quit and restart DSH Desktop. Start the knowledge service before asking a question.'
