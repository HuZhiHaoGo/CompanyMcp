param([Parameter(Mandatory = $true)][string]$MsiPath)

$ErrorActionPreference = 'Stop'
$msi = Get-Item -LiteralPath $MsiPath
$signature = Get-AuthenticodeSignature -LiteralPath $msi.FullName
if ($msi.Extension -ine '.msi' -or $signature.Status -ne 'Valid' -or
    $signature.SignerCertificate.GetNameInfo([System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false) -ne 'The Document Foundation') {
    throw 'Use an official LibreOffice MSI signed by The Document Foundation.'
}

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$toolsRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot 'tools')).Path
$destination = Join-Path $toolsRoot 'libreoffice'
if (Test-Path -LiteralPath $destination) { throw "LibreOffice runtime already exists: $destination" }

$stage = New-Item -ItemType Directory -Path (Join-Path $toolsRoot ('.libreoffice-' + [Guid]::NewGuid().ToString('N')))
$image = Join-Path $stage.FullName 'image'
$prefix = $stage.FullName + [IO.Path]::DirectorySeparatorChar
try {
    $arguments = @('/a', ('"{0}"' -f $msi.FullName), '/qn', '/norestart', ('TARGETDIR="{0}"' -f $image))
    $extract = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\msiexec.exe') -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru
    if ($extract.ExitCode -ne 0) { throw "LibreOffice MSI extraction failed ($($extract.ExitCode))." }

    $programs = @(Get-ChildItem -LiteralPath $image -Recurse -File -Filter 'soffice.com')
    if ($programs.Count -ne 1) { throw 'The extracted image should contain exactly one soffice.com.' }
    $program = $programs[0]
    $runtime = $program.Directory.Parent.FullName
    if (!$runtime.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -or
        [IO.Path]::GetDirectoryName($destination) -ne $toolsRoot) { throw 'Unexpected LibreOffice paths.' }

    $binary = Join-Path $runtime 'program\soffice.bin'
    $reader = [IO.BinaryReader]::new([IO.File]::OpenRead($binary))
    try {
        $reader.BaseStream.Position = 0x3c
        $reader.BaseStream.Position = $reader.ReadInt32()
        if ($reader.ReadUInt32() -ne 0x4550 -or $reader.ReadUInt16() -ne 0x8664) { throw 'LibreOffice must be Windows x64.' }
    } finally { $reader.Dispose() }

    # The MSI places these redistributables in System32 on a normal install.
    # Keep them beside soffice for portable use.
    Get-ChildItem -LiteralPath (Join-Path $runtime 'System64') -File -Filter '*.dll' | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $program.Directory.FullName
    }
    Get-ChildItem -LiteralPath $runtime -File -Filter '*.msi' | ForEach-Object { Remove-Item -LiteralPath $_.FullName }
    $version = $program.VersionInfo.ProductVersion
    $sha256 = (Get-FileHash -LiteralPath $msi.FullName -Algorithm SHA256).Hash
    @("LibreOffice $version (Windows x64)", 'Source: https://www.libreoffice.org/download/', "Upstream MSI: $($msi.Name)", "MSI SHA-256: $sha256", 'License and notices: license.txt and NOTICE.') |
        Set-Content -LiteralPath (Join-Path $runtime 'SOURCE.md') -Encoding UTF8
    Move-Item -LiteralPath $runtime -Destination $destination
    Write-Host "Prepared LibreOffice $version in $destination"
} finally {
    $resolvedStage = (Resolve-Path -LiteralPath $stage.FullName).Path
    if ($resolvedStage -eq $stage.FullName -and [IO.Path]::GetDirectoryName($resolvedStage) -eq $toolsRoot) {
        Remove-Item -LiteralPath $resolvedStage -Recurse -Force
    }
}
