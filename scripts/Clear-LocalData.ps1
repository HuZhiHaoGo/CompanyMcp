[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
param([switch]$IncludeConfig, [string]$DataDirectory = '')

. (Join-Path $PSScriptRoot 'common.ps1')

function Assert-PlainPath([string]$FilePath) {
    $current = $FilePath
    while ($current) {
        $item = Get-Item -LiteralPath $current -Force -ErrorAction SilentlyContinue
        if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw "Cleanup refused a symbolic link or junction: $current"
        }
        $current = [IO.Path]::GetDirectoryName($current)
    }
}

function Read-CacheJson([string]$FilePath) {
    try { Get-Content -LiteralPath $FilePath -Raw -Encoding UTF8 | ConvertFrom-Json }
    catch { return $null }
}

$ConfigFile = Join-Path $ProjectRoot 'config\local.json'
Assert-PlainPath $ConfigFile
if (!(Test-Path -LiteralPath $ConfigFile -PathType Leaf)) { throw 'Missing config/local.json. Run from the active knowledge plugin directory.' }
$config = Read-CacheJson $ConfigFile
if ($null -eq $config) { throw 'Invalid local configuration. Correct the JSON before cleaning.' }
$relative = $config.dataDirectory
if (!$relative) { $relative = '..\data' }
if ($relative -isnot [string]) { throw 'Invalid dataDirectory in local configuration.' }
$cache = if ([IO.Path]::IsPathRooted($relative)) { [IO.Path]::GetFullPath($relative) } else { [IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $ConfigFile) $relative)) }
$cache = $cache.TrimEnd([char[]]@('\','/'))
$defaultCache = [IO.Path]::GetFullPath((Join-Path $ProjectRoot 'data'))
if ($cache -ne $defaultCache -and !$DataDirectory) { throw 'This configuration uses a custom dataDirectory. Supply that exact absolute path with -DataDirectory.' }
if ($DataDirectory -and ($DataDirectory -notmatch '^(?:[a-zA-Z]:[\\/]|[\\/]{2})' -or [IO.Path]::GetFullPath($DataDirectory).TrimEnd([char[]]@('\','/')) -ne $cache)) { throw 'The explicit data directory must match local.json.' }
if (!$cache -or $cache -eq [IO.Path]::GetPathRoot($cache).TrimEnd([char[]]@('\','/')) -or $cache -eq $ProjectRoot) { throw 'Cleanup refused a volume root or the project root.' }
Assert-PlainPath $cache
$selection = Join-Path $cache 'dsh-selection'
Assert-PlainPath $selection

# Only remove artifacts recognized by this plugin. Never remove a whole directory.
$files = [System.Collections.Generic.List[string]]::new()
$uuid = '[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}'
if (Test-Path -LiteralPath $cache -PathType Container) {
    foreach ($item in (Get-ChildItem -LiteralPath $cache -File -Force)) {
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
        if ($item.Name -match "^($uuid)\.json$") {
            $id = $Matches[1]
            $snapshot = Read-CacheJson $item.FullName
            if ($snapshot.schema -eq 'tbea-snapshot/v1' -and $snapshot.id -eq $id) { $files.Add($item.FullName) }
        } elseif ($item.Name -match '^([a-f0-9]{24})\.image\.json$') {
            $id = $Matches[1]
            $metadata = Read-CacheJson $item.FullName
            if ($metadata.type -notin 'image/png','image/jpeg','image/webp','image/gif') { continue }
            $binary = Get-Item -LiteralPath (Join-Path $cache "$id.bin") -Force -ErrorAction SilentlyContinue
            if ($binary -and !$binary.PSIsContainer -and !($binary.Attributes -band [IO.FileAttributes]::ReparsePoint)) { $files.Add($binary.FullName) }
            $files.Add($item.FullName)
        }
    }
}
if (Test-Path -LiteralPath $selection -PathType Container) {
    foreach ($item in (Get-ChildItem -LiteralPath $selection -File -Force)) {
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $item.Name -notmatch '^[a-f0-9]{64}\.json$') { continue }
        $state = Read-CacheJson $item.FullName
        if ($state.schema -eq 'tbea-selection/v1' -and $state.selected -is [bool]) { $files.Add($item.FullName) }
    }
}
if (!$files.Count -and !$IncludeConfig) { Write-Host 'No knowledge cache or session selections to remove.'; return }
$action = "Remove $($files.Count) recognized cache and selection files"
if ($IncludeConfig) { $action += " and delete configuration with credentials: $ConfigFile" }
if (!$PSCmdlet.ShouldProcess($cache, $action)) { return }
& $NodeExe (Join-Path $ProjectRoot 'dist\service-control.mjs') 'check-stopped' $ConfigFile
if ($LASTEXITCODE -ne 0) { throw 'Cleanup requires the app and MCP to be stopped.' }
foreach ($file in $files) {
    Assert-PlainPath $file
    Remove-Item -LiteralPath $file -Force -Confirm:$false
}
if ($IncludeConfig) {
    Assert-PlainPath $ConfigFile
    Remove-Item -LiteralPath $ConfigFile -Force -Confirm:$false
}
Write-Host 'Requested local knowledge data cleanup complete.'
