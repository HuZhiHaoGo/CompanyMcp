. (Join-Path $PSScriptRoot 'common.ps1')
& $NodeExe (Join-Path $PSScriptRoot 'init.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Initialization failed.' }
