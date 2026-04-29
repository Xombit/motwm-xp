# PowerShell pack script for MOTWM XP module
param()

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
    & (Join-Path $PSScriptRoot "build-release.ps1")
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}