# PowerShell pack script for MOTWM XP module
param()

# Load module.json to get name and version
$moduleJson = Get-Content "module.json" | ConvertFrom-Json
$name = $moduleJson.id
$version = $moduleJson.version

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
    # Add built files from dist/
    $distFiles = @("main.js", "styles.css")
    foreach ($file in $distFiles) {
        $distPath = "dist\$file"
        if (Test-Path $distPath) {
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $distPath, $file)
        }
    }
    
    # Add root module files
    $rootFiles = @("module.json", "README.md", "LICENSE", "CHANGELOG.md")
    foreach ($file in $rootFiles) {
        if (Test-Path $file) {
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file, $file)
        }
    }
    
    # Add templates
    $templatesDir = "src\ui\templates"
    if (Test-Path $templatesDir) {
        $templates = Get-ChildItem "$templatesDir\*.hbs"
        foreach ($template in $templates) {
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $template.FullName, "templates\$($template.Name)")
        }
    }
} finally {
    $zip.Dispose()
}

Write-Host "Package created: $packagePath"