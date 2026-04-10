# PowerShell pack script for MOTWM XP module
param()

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

# Load module.json to get name and version
$moduleJson = Get-Content "module.json" | ConvertFrom-Json
$name = $moduleJson.id
$version = $moduleJson.version

Write-Host "Packaging $name v$version..." -ForegroundColor Cyan

# Resolve Node 20 from nvm-windows (required for vite)
$nvmDir = "$env:LOCALAPPDATA\nvm"
$node20Dir = Get-ChildItem $nvmDir -Directory -Filter "v20.*" -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1

if (-not $node20Dir) {
    Write-Host "Error: Node 20 not found under $nvmDir" -ForegroundColor Red
    exit 1
}

$npmPath = Join-Path $node20Dir.FullName "npm.cmd"
$env:PATH = "$($node20Dir.FullName);$env:PATH"

# Build first
Write-Host "Building module..." -ForegroundColor Yellow
& $npmPath run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Aborting." -ForegroundColor Red
    Pop-Location
    exit 1
}

# Create packages directory if it doesn't exist
$packagesDir = "packages"
if (-not (Test-Path $packagesDir)) {
    New-Item -ItemType Directory -Path $packagesDir
}

# Create package path
$packagePath = "$packagesDir\$name-$version.zip"

# Remove existing package if it exists
if (Test-Path $packagePath) {
    Remove-Item $packagePath
}

# Create zip file
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($packagePath, 'Create')

try {
    # Add built files from dist/ (preserve dist/ folder structure)
    $distFiles = @("main.js", "styles.css")  # source maps excluded from release
    foreach ($file in $distFiles) {
        $distPath = "dist\$file"
        if (Test-Path $distPath) {
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $distPath, "dist\$file") | Out-Null
        }
    }
    
    # Add root module files
    $rootFiles = @("module.json", "README.md", "LICENSE", "CHANGELOG.md")
    foreach ($file in $rootFiles) {
        if (Test-Path $file) {
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file, $file) | Out-Null
        }
    }
    
    # Add templates
    $templatesDir = "templates"
    if (Test-Path $templatesDir) {
        $templates = Get-ChildItem "$templatesDir\*.hbs"
        foreach ($template in $templates) {
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $template.FullName, "templates\$($template.Name)") | Out-Null
        }
    }

} finally {
    $zip.Dispose()
}

Pop-Location
Write-Host ""
Write-Host "Package created: $packagePath" -ForegroundColor Green