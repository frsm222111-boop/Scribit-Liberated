# UnBrickIt GUI

Desktop app for ScribIt firmware upload and G-code control.

## Installation

### macOS

1. Download `.dmg` from [Releases](https://github.com/karimi/scrubit/releases)
2. Open DMG, drag to Applications
3. Open app from Applications

The app is ad-hoc signed and ready to use.

### Windows

1. Download `.exe` from [Releases](https://github.com/karimi/scrubit/releases)
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

## Features (Planned)

- Firmware upload via espota.py
- WiFi configuration
- G-code file upload
- SVG to G-code conversion
- Device status monitoring
- Real-time drawing progress

## Current Status

See [PROGRESS.md](PROGRESS.md) for development roadmap.
