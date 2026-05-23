# Pre-compiled Firmware Releases

## Downloading Firmware

Firmware binaries are attached to GitHub Releases tagged `v*.*.*`.

**Latest Release:** [github.com/karimi/unbrickit/releases/latest](https://github.com/karimi/unbrickit/releases/latest)

Each release includes:
- `ScribitESP.ino.bin` — ESP32 firmware (local mode, MQTT disabled)
- `MK4duo.ino.bin` — SAMD21 firmware (unchanged from upstream)
- `ScribitESP.ino.partitions.bin` — ESP32 partition table

## Flashing via GUI App

The Electron GUI app (`gui-app/`) is the recommended way to flash firmware. It bundles everything and handles the OTA process automatically.

## Manual Flashing

If using the GUI isn't an option, use `espota.py` from the Briki SDK:

```bash
# ESP32 firmware
python espota.py -i <device-ip> -p 3232 -f ScribitESP.ino.bin

# SAMD21 firmware
python espota.py -i <device-ip> -p 3232 -c -f MK4duo.ino.bin

# Partition table
python espota.py -i <device-ip> -p 3232 -s -f ScribitESP.ino.partitions.bin
```

**NOTE:** Use `MK4duo.ino.bin` (NOT the `with_bootloader` version) for OTA. The bootloader version is only for initial USB flashing.

## Building from Source

See [FIRMWARE.md](../FIRMWARE.md) for Docker-based compilation instructions.