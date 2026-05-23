# Unbrickit — Summary of Fixes & Upgrades

**Project:** [karimi/unbrickit](https://github.com/karimi/unbrickit)  
**Date:** 2026-05-22  
**Baseline:** v1.5.0 (commit `5d2d3d1`)  
**Latest:** commit `443e29d` (Phase 2 web interface, color parsing, tool improvements)

---

## Why This Project Exists

Scribit was a wall-drawing robot that required a cloud service to operate. When Scribit's servers went down, the robot stopped working. This project reverse-engineered the Scribit firmware to enable **fully local operation** — no cloud, no account, no internet required.

This document describes the fixes and improvements made by Kent Haizlett to the `karimi/unbrickit` project in the May 2022 session.

---

## What Was Fixed

### 1. Boot Loop — MQTT Empty-Host Crash (v1.3.0+)
**Problem:** The ESP32 firmware would boot, reach the MQTT initialization step, then crash and revert to bootloader mode (showing `MBC-WB-...` network instead of `ScribIt-...`). This affected both original and modified firmware.

**Root causes identified:**
1. `ScribIt.cpp:181-195` — Infinite `while` loop waiting for MQTT status message. Without a broker, it loops forever → watchdog timeout → crash → recovery mode.
2. `SIMQTT.begin()` — Attempts TCP connection with an empty `SI_MQTT_HOST` string, causing an immediate crash.

**Fixes applied:**
- Skip MQTT initialization entirely when `SI_MQTT_HOST` is empty
- Made SAMD21 sync non-fatal — device continues to BOOT state even if sync fails
- Added 3-second boot timeout — forces transition to IDLE if no MQTT response arrives

**Files changed:** `Firmware/ScribitESP/ScribIt.cpp`, `Firmware/ScribitESP/SIMQTT.cpp`

---

### 2. GUI Postinstall Script — Production Install Breakage
**Problem:** Running `npm install` in production (e.g., `npm ci --production`) would execute the Python runtime setup script, which fails without dev dependencies and leaves the app in a broken state.

**Fix:** Added `NODE_ENV=production` check in `gui-app/scripts/setup-python.js`. The script now exits cleanly on production installs and properly fails with an error message if Python setup actually can't complete.

**Files changed:** `gui-app/scripts/setup-python.js`

---

## What Was Added

### 3. CSS Color Parsing in SVG Converter
**Problem:** The SVG converter only recognized a handful of exact color formats (`#ff0000`, `red`, `#f00`). Any other CSS color — `rgb()`, `rgba()`, named colors like `orange` or `cyan` — would silently default to pen 1 (black).

**Fix:** Added `parse_css_color()` function that handles:
- Named CSS colors: `orange`, `cyan`, `magenta`, `yellow`, `pink`, `purple`, `brown`, `gray`, `grey`, `white`, `lime`, `navy`
- Hex3: `#f00` → `(255, 0, 0)`
- Hex6: `#ff0000` → `(255, 0, 0)`
- RGB: `rgb(255, 0, 0)`
- RGBA: `rgba(255, 0, 0, 0.5)`

Added `color_to_pen()` using nearest-neighbor Euclidean distance in RGB space to map any CSS color to the closest pen (black→1, red→2, blue→3, green→4).

**Files changed:** `tools/scribit_svg_to_gcode.py`

---

### 4. SVG Converter — New CLI Flags
**Added `--resolution` / `-d`:** Controls arc/curve sampling density. Smaller values = more points = finer curves. Default: 5.0mm max distance between points.

**Added `--aspect-x` and `--aspect-y`:** Expose the geometry compensation factors as CLI arguments instead of hardcoded values. Default: 0.893 (X) and 1.25 (Y) — calibrated for specific wall geometry.

**Added `--stats`:** Shows G-code statistics (command count, pen up/down events, resolution, compensation factors) without writing a file. Useful for previewing before upload.

**Files changed:** `tools/scribit_svg_to_gcode.py`

---

### 5. Phase 2 Web Interface (Device-Hosted)
**Problem:** Controlling the Scribit required either the desktop GUI app or manual `curl` commands. No simple in-browser interface existed.

**Solution:** Added web interface served directly from the Scribit's ESP32 SPIFFS filesystem. After flashing updated firmware, the robot serves its own control panel at `http://192.168.240.1:8888/`.

**New files:**
- `Firmware/ScribitESP/data/index.html` — Drag-and-drop upload form, erase mode toggle, device controls, calibration helper
- `Firmware/ScribitESP/data/style.css` — Mobile-friendly responsive dark theme
- `Firmware/ScribitESP/data/app.js` — G-code handling, erase-mode Y-offset (-77mm for ceramic eraser), 3-second status polling, calibration g-code generator

**New firmware routes added to `ScribIt_wifi.cpp`:**
| Route | Method | Description |
|-------|--------|-------------|
| `/api/status` | GET | JSON device state (same as `/status`) |
| `/gcode` | POST | Send raw g-code line directly to serial manager |
| `/stop` | POST | Stop current job, return to IDLE |
| `/*` | GET | Serve static files from SPIFFS `/data/` directory |

**Files changed:** `Firmware/ScribitESP/ScribIt_wifi.cpp`  
**Files added:** `Firmware/ScribitESP/data/{index.html,style.css,app.js}`

---

### 6. Documentation — Missing Roadmap
**Problem:** `PROGRESS_TRACKER.md` referenced an `IMPLEMENTATION_PLAN.md` that did not exist, leaving users without a clear project roadmap.

**Fix:** Created `IMPLEMENTATION_PLAN.md` documenting all phases, current status, hardware research (pen switching, erase mode offsets), and quick-start commands.

---

### 7. Documentation — New Contributor Guide
**Problem:** No `CONTRIBUTING.md` existed for external contributors to understand how to set up, build, and submit changes.

**Fix:** Created `CONTRIBUTING.md` covering clone, build (Docker for firmware, npm for GUI), testing SVG converter, flashing firmware, code style, and PR process.

---

### 8. Documentation — Changelog
**Problem:** No formal changelog existed to document what changed between releases.

**Fix:** Created `CHANGELOG.md` documenting all changes since v1.5.0, with sections for Added, Fixed, and Changed.

---

### 9. Repository Cleanup
- **`tools/archive/` removed** — contained superseded old scripts (`svg_to_gcode.py`, `scribit_kinematics.py`) that were replaced by the current `scribit_svg_to_gcode.py`. Kept only the active tool.
- **`docker/builds/` gitignored** — binary firmware blobs no longer committed to the repo.
- **`releases/README.md` updated** — removed placeholder text, pointed to real GitHub releases page.
- **Python cache gitignored** — `__pycache__/` and `*.pyc` files excluded from commits.

**Files deleted:** `tools/archive/` (4 files, ~1000 lines)  
**Files changed:** `.gitignore`, `releases/README.md`

---

## Summary by File

| File | Change |
|------|--------|
| `tools/scribit_svg_to_gcode.py` | CSS color parsing, `--resolution`, `--aspect-x/--y`, `--stats`, improved error messages |
| `gui-app/scripts/setup-python.js` | `NODE_ENV=production` skip, proper error exit codes |
| `Firmware/ScribitESP/ScribIt_wifi.cpp` | Static file serving from SPIFFS, `/api/status`, `/gcode`, `/stop` routes |
| `Firmware/ScribitESP/data/index.html` | New — drag-and-drop upload UI, device controls, calibration helper |
| `Firmware/ScribitESP/data/style.css` | New — mobile-friendly dark theme |
| `Firmware/ScribitESP/data/app.js` | New — erase mode, status polling, calibration generator |
| `CHANGELOG.md` | New — change log since v1.5.0 |
| `CONTRIBUTING.md` | New — setup and contribution guide |
| `IMPLEMENTATION_PLAN.md` | New — full project roadmap |
| `releases/README.md` | Updated — real release instructions |
| `.gitignore` | Updated — added `docker/builds/`, `__pycache__/` |
| `tests/test_svg_converter.py` | New — 20+ unit tests for color parsing and kinematics |
| `tools/archive/` | Deleted — superseded scripts removed |

---

## How to Update an Existing Installation

### For Users with v1.5.0 Firmware Already Installed

If the Scribit is already running the local-mode firmware (boot loop fixed), you only need to flash the ESP32 with the updated firmware to get the web interface. Steps:

```bash
# 1. Pull latest changes
git pull

# 2. Build the ESP32 firmware with Docker
docker-compose -f docker/docker-compose.yml run --rm scribit-firmware \
  arduino-cli compile --fqbn briki:mbc-wb:mbc:mcu=esp \
  --output-dir /workspace/builds \
  /workspace/source/Firmware/ScribitESP/ScribitESP.ino

# 3. Copy built firmware
cp docker/builds/ScribitESP.ino.bin gui-app/resources/firmware/

# 4. Flash via the GUI app, or manually:
python espota.py -i 192.168.240.1 -p 3232 -f docker/builds/ScribitESP.ino.bin
python espota.py -i 192.168.240.1 -p 3232 -s -f docker/builds/ScribitESP.ino.partitions.bin

# 5. After flashing, open browser to:
http://192.168.240.1:8888/
```

The web interface is served directly from the robot's SPIFFS — no desktop app needed.

### For New Users

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full setup instructions.

---

## What Still Needs Doing

- **Phase 2 Web Interface** — works for device control and g-code upload. SVG→g-code conversion in-browser is a placeholder (client-side SVG parsing is complex; use the desktop GUI app or CLI tool for SVG files).
- **Phase 3 Local MQTT** — fully optional; enables complete cloud-free operation including auto-calibration.
- **Phase 4 G-code Tools** — batch SVG processing, direct upload from CLI with `--upload` flag.

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for full roadmap.