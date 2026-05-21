# UnBrickIt GUI

Desktop app for ScribIt firmware upload and G-code control.

## Installation

### macOS

1. Download `.dmg` from [Releases](https://github.com/karimi/unbrickit/releases)
2. Open DMG, drag to Applications
3. **Remove quarantine flag** (required on first launch):
   ```bash
   xattr -d com.apple.quarantine /Applications/UnBrickIt.app
   ```
4. Open app from Applications

**Why?** The app is ad-hoc signed (not notarized with Apple Developer account). macOS Gatekeeper blocks unnotarized apps by default. The command above removes the quarantine flag so the app can launch.

### Windows

1. Download `.exe` from [Releases](https://github.com/karimi/unbrickit/releases)
2. Run installer
3. Launch from Start Menu

## Development

### Setup

```bash
cd gui-app
npm install
```

### Run Dev Mode

```bash
npm run dev
```

### Build

```bash
npm run build
npm run dist
```

### Creating a Release

To create a new release:

1. **Bump version** in `package.json`:
   ```bash
   # Edit gui-app/package.json, update "version" field
   # Example: "1.3.0" → "1.4.0"
   ```

2. **Commit version bump**:
   ```bash
   git add gui-app/package.json
   git commit -m "Bump version to 1.4.0"
   ```

3. **Create and push tag**:
   ```bash
   git tag -a v1.4.0 -m "Release v1.4.0

   - Feature 1
   - Feature 2
   - Bug fix 3"

   git push origin gui_app
   git push origin v1.4.0
   ```

4. **GitHub Actions** automatically builds:
   - Firmware binaries (ESP32 + SAMD21)
   - macOS installer (.dmg)
   - Windows installer (.exe)
   - Creates GitHub Release with all artifacts

Release will be available at: https://github.com/karimi/unbrickit/releases

## Features (Planned)

- Firmware upload via espota.py
- WiFi configuration
- G-code file upload
- SVG to G-code conversion
- Device status monitoring
- Real-time drawing progress

## Current Status

See [PROGRESS.md](PROGRESS.md) for development roadmap.
