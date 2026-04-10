#!/usr/bin/env python3

import json
import subprocess
import sys
import zipfile
from pathlib import Path

# Always run from repo root regardless of where the script is invoked from
root = Path(__file__).parent.parent

# Load module.json to get name and version
with open(root / "module.json") as f:
    data = json.load(f)
    name = data["id"]
    version = data["version"]

print(f"Packaging {name} v{version}...")

# Build first so the package always contains a fresh dist/
print("Building module...")
result = subprocess.run(["npm", "run", "build"], cwd=root)
if result.returncode != 0:
    print("Build failed! Aborting.", file=sys.stderr)
    sys.exit(1)

# Create package
package_path = root / f"packages/{name}-{version}.zip"
package_path.parent.mkdir(exist_ok=True)

with zipfile.ZipFile(package_path, "w", zipfile.ZIP_DEFLATED) as z:
    # Add built files from dist/ — source maps excluded from release
    dist_files = ["main.js", "styles.css"]
    for filename in dist_files:
        dist_path = root / "dist" / filename
        if dist_path.exists():
            z.write(dist_path, f"dist/{filename}")
    
    # Add root module files
    root_files = ["module.json", "README.md", "LICENSE", "CHANGELOG.md"]
    for filename in root_files:
        p = root / filename
        if p.exists():
            z.write(p, filename)
    
    # Add templates directory
    templates_dir = root / "templates"
    if templates_dir.exists():
        for template in templates_dir.glob("*.hbs"):
            z.write(template, f"templates/{template.name}")

print(f"\nPackage created: {package_path}")
