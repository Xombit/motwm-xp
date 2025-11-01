#!/usr/bin/env python3

import json
import zipfile
from pathlib import Path

# Load module.json to get name and version
with open("module.json") as f:
    data = json.load(f)
    name = data["id"]
    version = data["version"]

# Create package
package_path = Path(f"packages/{name}-{version}.zip")
package_path.parent.mkdir(exist_ok=True)

with zipfile.ZipFile(package_path, "w", zipfile.ZIP_DEFLATED) as z:
    # Add built files from dist/ (preserve dist/ folder structure)
    dist_files = ["main.js", "styles.css"]
    for filename in dist_files:
        dist_path = Path("dist") / filename
        if dist_path.exists():
            z.write(dist_path, f"dist/{filename}")
    
    # Add root module files
    root_files = ["module.json", "README.md", "LICENSE", "CHANGELOG.md"]
    for filename in root_files:
        if Path(filename).exists():
            z.write(filename)
    
    # Add templates directory
    templates_dir = Path("templates")
    if templates_dir.exists():
        for template in templates_dir.glob("*.hbs"):
            # Keep templates in templates/ folder structure
            z.write(template, f"templates/{template.name}")

print(f"Package created: {package_path}")
