param([switch]$Desktop, [string]$HarnessHome)
. (Join-Path $PSScriptRoot 'common.ps1')
$DoctorArguments = @()
if ($Desktop) { $DoctorArguments += '--desktop' }
if ($HarnessHome) { $DoctorArguments += @('--harness-home', $HarnessHome) }
& $NodeExe (Join-Path $ProjectRoot 'dist\doctor.mjs') @DoctorArguments
if ($LASTEXITCODE -ne 0) { throw 'Diagnostics failed.' }
