. (Join-Path $PSScriptRoot 'common.ps1')
& $NodeExe (Join-Path $ProjectRoot 'dist\doctor.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Diagnostics failed.' }
