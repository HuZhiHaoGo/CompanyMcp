param([ValidateNotNullOrEmpty()][string]$Profile = 'desktop')
if ($Profile -ieq 'desktop' -or $Profile -ieq 'desktop-safe-mode') {
    throw 'This profile is managed by Jiangbao. Uninstall dsh-plugin-tbea-knowledge in Jiangbao Plugin Manager, then fully restart Jiangbao.'
}
. (Join-Path $PSScriptRoot 'common.ps1')
$Dsh = Get-Command dsh -ErrorAction SilentlyContinue
if (-not $Dsh) { throw 'Open the terminal from the Jiangbao tray and run this script again.' }
$RemoveArgs = @('plugin', '--profile', $Profile, 'remove', 'dsh-plugin-tbea-knowledge')
# pnpm remove does not accept these options as flags. Scope them to the child process.
$PreviousOffline = $env:npm_config_offline
$PreviousScripts = $env:npm_config_ignore_scripts
try {
    $env:npm_config_offline = 'true'
    $env:npm_config_ignore_scripts = 'true'
    & $Dsh.Source @RemoveArgs
    $RemoveExitCode = $LASTEXITCODE
} finally {
    $env:npm_config_offline = $PreviousOffline
    $env:npm_config_ignore_scripts = $PreviousScripts
}
if ($RemoveExitCode -ne 0) { throw 'Plugin removal failed. Check the target profile. For a plugin installed from the desktop plugin manager, use its Uninstall action.' }
Write-Host 'Plugin removed from this profile. Local configuration, cache and session selections were preserved.'
$ConfigFile = Join-Path $ProjectRoot 'config\local.json'
if (Test-Path -LiteralPath $ConfigFile -PathType Leaf) {
  & $NodeExe (Join-Path $ProjectRoot 'dist\service-control.mjs') 'stop-for-uninstall' $ConfigFile
  if ($LASTEXITCODE -ne 0) { Write-Warning 'Plugin removal succeeded, but MCP shutdown was not confirmed.' }
}
Write-Host 'Fully exit and restart Jiangbao to reload the profile. Any independent MCP is managed separately.'
