# Copilot Instructions for Scribit Open Firmware

## Project Overview
- This repository contains firmware for the Scribit robot, supporting both ESP32 and SAMD21 microcontrollers.
- Main firmware entry points:
  - ESP32: `Firmware/ScribitESP/ScribitESP.ino`
  - SAMD21: `Firmware/MK4duo/MK4duo.ino`
- The codebase is split into two major components:
  - `Firmware/ScribitESP/`: Wi-Fi, MQTT, OTA, LED, and device logic for ESP32.
  - `Firmware/MK4duo/`: Motion control, G-code parsing, and hardware management for SAMD21.
- Shared libraries and configuration files are located in `ExtraFile/` and must be copied before building.

## Build & Development Workflow
- **Recommended build method:** Docker (see `docker/README.md`).
  - ESP32: `docker-compose -f docker/docker-compose.yml run --rm scribit-firmware arduino-cli compile --fqbn briki:mbc-wb:mbc:mcu=esp --output-dir /workspace/builds /workspace/source/Firmware/ScribitESP/ScribitESP.ino`
  - SAMD21: `docker-compose -f docker/docker-compose.yml run --rm scribit-firmware arduino-cli compile --fqbn briki:mbc-wb:mbc:mcu=samd --output-dir /workspace/builds /workspace/source/Firmware/MK4duo/MK4duo.ino`
- **Manual build:** Use Arduino IDE 1.8.19 with Briki MBC-WB board v2.0.0. See `README.md` for board setup and hardware overrides.
- **Configuration files:**
  - Copy from `ExtraFile/*.example` to the appropriate firmware folders before compiling.
  - Libraries (`arduino-mqtt`, `StepperDriver`) must be present in `Firmware/ScribitESP/`.
- **Output binaries:** Saved in `docker/builds/`.

## Key Patterns & Conventions
- **Test/diagnostic mode:** Both firmwares check for button presses at startup to enter test mode (`checkTestAndRun` in ESP, `checkAndRunTest` in SAMD).
- **Firmware version sync:** SAMD firmware syncs with ESP via serial at startup (`syncWithEsp`).
- **Wi-Fi setup:** Device exposes AP (`ScribIt-AP`), config via POST to `192.168.240.1:8888`.
- **LED status:** See `docs/support-scribit-design/led-status.md` for device feedback patterns.
- **Partition/hardware overrides:** Some files in `ExtraFile/` must overwrite board files in Arduino15 for correct flashing.

## Integration Points
- **MQTT:** Used for device communication (see `SIMQTT.cpp`, `SIMQTT.hpp`).
- **OTA:** Firmware update via network (see `ScribIt_update.cpp`).
- **G-code:** Motion and print commands handled in SAMD firmware (`MK4duo.ino`).

## Troubleshooting & Known Issues
- See `README.md` and `docker/README.md` for common build and flashing issues.
- Partition table and SERCOM.cpp overrides are critical for successful flashing.
- LED and serial feedback are used for device status and debugging.

## References
- `README.md`, `docker/README.md`, `docs/support-scribit-design/led-status.md`
- Example configuration: `ExtraFile/*.example`
- User manual: `docs/MBC-WB-UserManual_v-2-1-min-1.pdf`

---
**For AI agents:**
- Always ensure configuration and library files are copied before building.
- Prefer Docker for reproducible builds.
- Reference the above files for device-specific logic, build steps, and troubleshooting.
- When updating or generating code, follow the patterns in the main `.ino` files and respect hardware-specific logic.
