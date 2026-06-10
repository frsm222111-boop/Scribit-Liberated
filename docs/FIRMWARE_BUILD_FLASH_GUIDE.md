# Unbrickit Firmware Build & Flash Guide

_Last updated: 2026-05-23_

## Overview

This guide walks through building the Unbrickit/Scribit custom firmware from source and flashing it to the robot via OTA (over WiFi). This allows you to deploy modified code with features like:
- G77 pen-homing auto-header on g-code upload
- Browser-based SVG→gcode converter
- Enhanced web UI with canvas preview, stats, and gcode preview

---

## Prerequisites

### Hardware & Network Setup

**IMPORTANT - Dual-Network Setup:** Your NucBox has only ONE WiFi adapter. To maintain a connection to both the robot AND OpenClaw simultaneously:

1. **Ethernet** → connects to your router → gives you internet (me)
2. **WiFi** → connects to Scribit robot → gives you robot control

**Network metric fix (run as Administrator in PowerShell):**
```powershell
netsh interface ipv4 set interface "Ethernet 5" metric=5
netsh interface ipv4 set interface "Wi-Fi 2" metric=50
```

This makes Windows prefer Ethernet for internet traffic, so you stay connected to me even while connected to the robot's WiFi.

### Software Requirements

- **Python 3.x** (for espota.py)
- **arduino-cli** (for building firmware)
- **Git** (to clone/keep repo updated)

---

## Step 1: Initial Setup (One-Time)

### 1.1 Install arduino-cli

Download from: https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip

Extract to `C:\Users\Kent\arduino-cli\`

### 1.2 Add board URLs

```powershell
cd C:\Users\Kent\arduino-cli
.\arduino-cli config add board_manager.additional_urls https://www.briki.org/download/resources/package_briki_index.json https://dl.espressif.com/dl/package_esp32_dev_index.json
.\arduino-cli core update-index
```

### 1.3 Install Briki MBC-WB board (v2.0.0)

```powershell
.\arduino-cli core install briki:mbc-wb@2.0.0
```

### 1.4 Set up firmware config files

Copy the example config files:
```powershell
cp "C:\Users\Kent\unbrickit\ExtraFile\SIConfig.hpp.example" "C:\Users\Kent\unbrickit\Firmware\ScribitESP\SIConfig.hpp"
cp "C:\Users\Kent\unbrickit\ExtraFile\ScribitVersion.hpp.example" "C:\Users\Kent\unbrickit\Firmware\ScribitESP\ScribitVersion.hpp"
cp "C:\Users\Kent\unbrickit\ExtraFile\Mk4duoVersion.h.example" "C:\Users\Kent\unbrickit\Firmware\MK4duo\Mk4duoVersion.h"
```

Copy library dependencies:
```powershell
cp -Recurse "C:\Users\Kent\unbrickit\ExtraFile\arduino-mqtt" "C:\Users\Kent\unbrickit\Firmware\ScribitESP\arduino-mqtt"
cp -Recurse "C:\Users\Kent\unbrickit\ExtraFile\StepperDriver" "C:\Users\Kent\unbrickit\Firmware\ScribitESP\StepperDriver"
```

Copy partition table overrides:
```powershell
mkdir "C:\Users\Kent\AppData\Local\Arduino15\packages\briki\hardware\mbc-wb\2.0.0\tools\partitions"
cp "C:\Users\Kent\unbrickit\ExtraFile\8MB_ffat.csv" "C:\Users\Kent\AppData\Local\Arduino15\packages\briki\hardware\mbc-wb\2.0.0\tools\partitions\8MB_ffat.csv"
cp "C:\Users\Kent\unbrickit\ExtraFile\8MB_spiffs.csv" "C:\Users\Kent\AppData\Local\Arduino15\packages\briki\hardware\mbc-wb\2.0.0\tools\partitions\8MB_spiffs.csv"
cp "C:\Users\Kent\unbrickit\ExtraFile\SERCOM.cpp" "C:\Users\Kent\AppData\Local\Arduino15\packages\briki\hardware\mbc-wb\2.0.0\cores\samd21\SERCOM.cpp"
```

### 1.5 Ensure firmware binaries are in place

The unbrickit app looks for firmware in `gui-app\resources\firmware\`. Build output goes there directly (see Step 2).

If doing manual flash, download from GitHub releases:
- https://github.com/karimi/unbrickit/releases/latest

Download: `ScribitESP.ino.bin`, `MK4duo.ino.bin`, `ScribitESP.ino.partitions.bin`
to `C:\Users\Kent\unbrickit\gui-app\resources\firmware\`

---

## Step 2: Build Firmware

### 2.1 Connect to Scribit WiFi

Connect your NucBox WiFi to `ScribIt-d9cbd4` (or whatever the robot's AP name is).
Password: `ScribItAP314` (or no password)

Verify connection:
```powershell
ping 192.168.240.1
```

### 2.2 Build all three firmware files

```powershell
# ESP32 firmware (with our custom code changes)
cd C:\Users\Kent\unbrickit
.\arduino-cli\arduino-cli compile -b briki:mbc-wb:mbc:mcu=esp --output-dir "C:\Users\Kent\unbrickit\gui-app\resources\firmware" "C:\Users\Kent\unbrickit\Firmware\ScribitESP\ScribitESP.ino"

# SAMD21 firmware (motion control - unchanged from upstream)
.\arduino-cli\arduino-cli compile -b briki:mbc-wb:mbc:mcu=samd --output-dir "C:\Users\Kent\unbrickit\gui-app\resources\firmware" "C:\Users\Kent\unbrickit\Firmware\MK4duo\MK4duo.ino"
```

---

## Step 3: Put Robot in Bootloader Mode

1. **Hold the left side of the LED** on the robot for 5+ seconds
2. Release when the LED starts **fast-flashing white**
3. The robot will broadcast `MBC-WB-XXXXXX` WiFi
4. Connect your WiFi to this network (not the ScribIt network)

Verify:
```powershell
ping 192.168.240.1
```

---

## Step 4: Flash Firmware via OTA

**Robot IP:** `192.168.240.1`
**OTA Port:** `3232`
**Python path:** `C:\Users\Kent\unbrickit\gui-app\resources\python\espota.py`

### 4.1 Flash ESP32 firmware

```powershell
python "C:\Users\Kent\unbrickit\gui-app\resources\python\espota.py" -i 192.168.240.1 -p 3232 -f "C:\Users\Kent\unbrickit\gui-app\resources\firmware\ScribitESP.ino.bin"
```

### 4.2 Wait 15 seconds, then flash SAMD21 firmware

```powershell
Start-Sleep 15
python "C:\Users\Kent\unbrickit\gui-app\resources\python\espota.py" -i 192.168.240.1 -p 3232 -c -f "C:\Users\Kent\unbrickit\gui-app\resources\firmware\MK4duo.ino.bin"
```

### 4.3 Flash ESP32 partitions (SPIFFS)

```powershell
python "C:\Users\Kent\unbrickit\gui-app\resources\python\espota.py" -i 192.168.240.1 -p 3232 -s -f "C:\Users\Kent\unbrickit\gui-app\resources\firmware\ScribitESP.ino.partitions.bin"
```

### 4.4 Wait for reboot and verify

```powershell
Start-Sleep 20
ping 192.168.240.1
python -c "import urllib.request, json; print(json.dumps(json.loads(urllib.request.urlopen('http://192.168.240.1:8888/status', timeout=5).read()), indent=2))"
```

---

## Step 5: Reconnect to Robot

After flashing, the robot may:
- **Option A:** Broadcast `ScribIt-XXXXXX` again (couldn't connect to your WiFi)
- **Option B:** Connect to your home WiFi (if it saved the credentials from earlier)

Check your WiFi networks. If you see `ScribIt-...` again, connect to it.

Verify:
```powershell
python -c "import urllib.request, json; print(json.loads(urllib.request.urlopen('http://192.168.240.1:8888/status', timeout=5).read()))"
```

---

## Testing the Firmware

### Test 1: G-code Upload (with G77 auto-header)

```powershell
python -c "
import urllib.request
req = urllib.request.Request('http://192.168.240.1:8888/upload',
    data=b'G1 X10 Y10\nM18\n',
    headers={'Content-Type': 'text/plain'})
resp = urllib.request.urlopen(req, timeout=30)
print(resp.read().decode())
"
```

**Expected:** The robot stores MORE bytes than you sent (because the G77 header is prepended).

### Test 2: Check Web UI

Open in browser: `http://192.168.240.1:8888/`

You should see the enhanced web UI with canvas preview, stats, and gcode preview.

### Test 3: SVG→gcode Test

1. Drop an SVG file onto the web UI at `http://192.168.240.1:8888/`
2. Watch it convert client-side
3. Click Upload to send to the robot

---

## Troubleshooting

### "No connection could be made because the target machine actively refused it"
- Robot is not in bootloader mode
- Wrong IP address
- Not connected to the right WiFi network

### "Error: timed out"
- Robot is not responding
- Try pinging 192.168.240.1 to verify connection

### Robot falls back to ScribIt-... AP every time
- It couldn't connect to your home WiFi
- Check the WiFi credentials sent were correct
- Make sure the home WiFi is 2.4GHz (Scribit doesn't support 5GHz)

### arduino-cli not found
- Make sure you're in the right directory: `cd C:\Users\Kent\arduino-cli`
- Or use the full path: `C:\Users\Kent\arduino-cli\arduino-cli.exe`

---

## Quick Reference

| Item | Value |
|------|-------|
| Robot local IP | `192.168.240.1:8888` |
| OTA port | `3232` |
| Robot WiFi | `ScribIt-d9cbd4` / `ScribItAP314` |
| Robot WiFi (bootloader) | `MBC-WB-XXXXXX` |
| arduino-cli | `C:\Users\Kent\arduino-cli\arduino-cli.exe` |
| espota.py | `C:\Users\Kent\unbrickit\gui-app\resources\python\espota.py` |
| Firmware output | `C:\Users\Kent\unbrickit\gui-app\resources\firmware\` |

---

## What's Included in Our Custom Firmware

### G77 Pen-Homing Fix
Every g-code upload automatically prepends:
```
M17       ; Enable motors
G77       ; Home pen
G90       ; Absolute mode
G1 Z89    ; Lift pen
G91       ; Relative mode
G1 Z-70   ; Lower pen
```

This ensures the pen is properly homed before any drawing starts.

### Browser SVG→gcode Converter
Drop an SVG onto the robot's web UI at `http://192.168.240.1:8888/` and it converts client-side.

### Enhanced Web UI
- Canvas preview showing string-geometry diagram
- Stats area (path count, estimated pen changes, bounding box)
- Gcode preview with show-more toggle

---

_Update this document as the process evolves. Last rebuilt firmware: 2026-05-23_