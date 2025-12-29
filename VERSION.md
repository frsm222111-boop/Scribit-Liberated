# Version Management

## Single Source of Truth

**Version is defined in: `gui-app/package.json`**

This version is used for:
- GUI application
- Firmware (ESP32)
- Git release tags

## Workflow

### 1. Bump Version

```bash
cd gui-app
npm version patch  # 1.1.0 -> 1.1.1
# or
npm version minor  # 1.1.0 -> 1.2.0
# or
npm version major  # 1.1.0 -> 2.0.0
```

### 2. Generate Firmware Version Header

```bash
node scripts/generate-version.js
```

This creates `Firmware/ScribitESP/FirmwareVersion.h` with the version from package.json.

### 3. Build Firmware

```bash
docker-compose -f docker/docker-compose.yml run --rm scribit-firmware \
  arduino-cli compile --fqbn briki:mbc-wb:mbc:mcu=esp \
  --output-dir /workspace/builds \
  /workspace/source/Firmware/ScribitESP/ScribitESP.ino
```

### 4. Copy Firmware to GUI Resources

```bash
cp docker/builds/ScribitESP.ino.bin gui-app/resources/firmware/
cp docker/builds/ScribitESP.ino.partitions.bin gui-app/resources/firmware/
```

### 5. Create Git Tag

```bash
git tag v$(node -p "require('./gui-app/package.json').version")
git push origin --tags
```

## Complete Release Script

```bash
#!/bin/bash
# Release new version

# 1. Bump version
cd gui-app && npm version $1 && cd ..

# 2. Generate firmware version header
node scripts/generate-version.js

# 3. Build firmware
docker-compose -f docker/docker-compose.yml run --rm scribit-firmware \
  arduino-cli compile --fqbn briki:mbc-wb:mbc:mcu=esp \
  --output-dir /workspace/builds \
  /workspace/source/Firmware/ScribitESP/ScribitESP.ino

# 4. Copy to resources
cp docker/builds/ScribitESP.ino.bin gui-app/resources/firmware/
cp docker/builds/ScribitESP.ino.partitions.bin gui-app/resources/firmware/

# 5. Commit and tag
VERSION=$(node -p "require('./gui-app/package.json').version")
git add .
git commit -m "release: v$VERSION"
git tag "v$VERSION"

echo "Release v$VERSION ready. Push with: git push origin gui_app v$VERSION"
```

## Files

- **Source of Truth:** `gui-app/package.json`
- **Generated (don't edit):** `Firmware/ScribitESP/FirmwareVersion.h`
- **Generator Script:** `scripts/generate-version.js`
