# Implementation Plan: Unbrickit

**Project:** [karimi/unbrickit](https://github.com/karimi/unbrickit) — Local firmware and control app for Scribit wall-drawing robot  
**Last Updated:** 2026-05-22  
**Status:** Phase 1 complete; Phase 2 (Web Interface) next

---

## Overview

The goal is to enable Scribit to execute g-code files **locally without any cloud dependency** (MQTT broker, calibration API).

### What's Been Done

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| 0 | Validation & Boot Loop Fix | ✅ Done | MQTT empty-host crash fixed; boot loop resolved |
| 1 | HTTP Upload Endpoint | ✅ Done | `POST /upload`, `/status`, `/pause`, `/resume` all working |
| 2 | Web Interface | 🔲 Next | HTML upload form, erase mode, calibration helper |
| 3 | Local MQTT Broker | 🔲 Future | Optional; for full cloud-free operation |
| 4 | G-code Conversion Tools | 🔲 Future | Improved SVG converter, batch processing |

---

## Phase 2: Web Interface

**Purpose:** Create a browser-based UI for easy g-code file uploads with erase mode and manual calibration helper.

### Features
- [ ] HTML drag-and-drop upload form served from device
- [ ] Erase mode toggle (applies -77mm Y offset to all coordinates)
- [ ] Manual calibration helper (input wall dimensions → generate starting position)
- [ ] Pen homing button (sends `G77` command)
- [ ] Real-time status display (IDLE / PRINTING / ERASING)
- [ ] WebSocket or polling for live status updates
- [ ] Mobile-friendly responsive design

### Hardware Capabilities (Research Done)
- **Pen switching:** 4 pens on 72° spacing, requires `G77` before each switch to avoid mechanical jam
- **Pen positions:** Z=89 (home), 161, 233, 305
- **Erasing:** Ceramic heater at Y-77mm from pen; use `M104 S[temp]`
- **Complete pen select pattern:** `G77` → `G1 Z[89/161/233/305]` → `G101`

### Files to Create
- `Firmware/ScribitESP/data/index.html` — Upload form
- `Firmware/ScribitESP/data/app.js` — G-code handling, coordinate transform
- `Firmware/ScribitESP/data/style.css` — Mobile-friendly styles

### Files to Modify
- `Firmware/ScribitESP/ScribIt_webserver.cpp` — Serve static files, add `/api/status` WebSocket
- `Firmware/ScribitESP/ScribIt.hpp` — Add web state tracking
- `Firmware/ScribitESP/ScribIt.cpp` — Integrate web handler in `loop()`

**Estimated Time:** 6–10 hours

---

## Phase 3: Local MQTT Broker (Optional)

**Purpose:** Allow Scribit to boot and operate fully without any external connectivity.

### Approach
1. Install [Mosquitto](https://mosquitto.org/) on a local machine or Raspberry Pi
2. Configure `SI_MQTT_HOST` in `SIConfig.hpp` to point to local broker
3. Device connects to local MQTT on startup, completes boot sequence
4. All original cloud features work locally

### Notes
- Requires MQTT broker running on same network
- Most useful for users who want complete offline operation

**Estimated Time:** 4–6 hours (mostly configuration, not code)

---

## Phase 4: G-code Conversion Tools

**Purpose:** Make it easy for non-technical users to convert their artwork to g-code.

### Improvements Needed
- [ ] `--preview` flag to show ASCII preview before generating
- [ ] Support for `rgb()`, `rgba()`, HSL color formats in SVG converter ✅ Done
- [ ] Expose `--resolution` parameter for tuning quality vs. file size ✅ Done
- [ ] Expose `--aspect-x/--aspect-y` for wall compensation ✅ Done
- [ ] `--stats` mode for pre-upload diagnostics ✅ Done
- [ ] Batch processing: convert multiple SVGs in one command
- [ ] Direct upload to device from CLI: `--upload --ip 192.168.240.1`

### GUI App Enhancements
- [ ] Built-in SVG preview with actual device coordinate mapping
- [ ] Live pen color preview (shows which pen will be used)
- [ ] "Erase mode" with visual Y-offset preview

**Estimated Time:** 20–40 hours

---

## Boot Loop Root Cause (Resolved)

The original firmware had two crash points:

1. **`ScribIt.cpp:181-195`** — Infinite `while` loop waiting for MQTT status message. Without MQTT broker the loop never exits → watchdog timeout → crash → recovery mode.
2. **`SIMQTT.begin()`** — Attempts TCP connection with empty `SI_MQTT_HOST` string, causing crash.

### Fixes Applied (v1.3.0+)
- Skip MQTT initialization when `SI_MQTT_HOST` is empty
- Made SAMD sync non-fatal (continues to BOOT state if sync fails)
- Added 3-second boot timeout — forces transition to IDLE if no MQTT response

---

## Quick Start (Current State)

```bash
# Connect to Scribit WiFi (ScribIt-XXXXXX / ScribItAP314)
# Check status
curl http://192.168.240.1:8888/status

# Upload g-code
curl -X POST http://192.168.240.1:8888/upload \
  -H "Content-Type: text/plain" \
  --data-binary @drawing.gcode

# Convert SVG → g-code
python3 tools/scribit_svg_to_gcode.py myart.svg \
  -a 2250 -l 1270 -r 1270 -o drawing.gcode

# Preview stats without writing
python3 tools/scribit_svg_to_gcode.py myart.svg \
  -a 2250 -l 1270 -r 1270 --stats
```

---

## Repository Structure

```
unbrickit/
├── tools/                        # Python CLI tools
│   ├── scribit_svg_to_gcode.py   # SVG → g-code (main tool)
│   └── scribit_*.py              # Primitive shape generators
├── Firmware/
│   ├── ScribitESP/               # ESP32 firmware (WiFi, HTTP, state machine)
│   └── MK4duo/                   # SAMD21 firmware (motion control)
├── gui-app/                      # Electron-based desktop GUI
│   ├── resources/
│   │   ├── firmware/             # Bundled .bin files for easy flash
│   │   ├── python/               # Portable Python runtime
│   │   └── samples/              # Sample SVG files
│   └── src/                      # Vue frontend source
├── docker/                       # Build environment
│   └── builds/                   # Compiled firmware output
├── docs/                         # Technical analysis docs
│   ├── FIRMWARE_ANALYSIS.md      # Architecture deep-dive
│   ├── PROGRESS_TRACKER.md       # Detailed session log
│   └── support-scribit-design/   # Original Scribit docs
└── ExtraFile/                    # Config templates, libraries
```

---

## Resources

- **Original firmware:** [scribit-open/open-firmware](https://github.com/scribit-open/open-firmware)
- **Board manual:** `docs/MBC-WB-UserManual_v-2-1-min-1.pdf`
- **LED guide:** `docs/support-scribit-design/led-status.md`
- **Manual calibration:** `docs/support-scribit-design/360025212312-How-to-Scribit-manual-calibration.md`