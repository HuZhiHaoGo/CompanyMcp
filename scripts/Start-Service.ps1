. (Join-Path $PSScriptRoot 'common.ps1')
& $NodeExe (Join-Path $ProjectRoot 'dist\server.mjs') --config (Join-Path $ProjectRoot 'config\local.json')
if ($LASTEXITCODE -ne 0) { throw 'Service stopped with an error.' }
