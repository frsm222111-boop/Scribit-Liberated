# Scribit Firmware - Build & Deploy

Complete guide for building and deploying Scribit firmware.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Building Firmware](#building-firmware)
- [Deploying Firmware](#deploying-firmware)
- [Verification](#verification)

---

## Overview

Scribit uses dual-MCU architecture:
- **ESP32** - WiFi, HTTP server, G-code interpreter
- **SAMD21** - Motion control, stepper drivers

Both firmwares must be compiled and flashed.

---

## Prerequisites

### Required Files

1. **Configuration files** (one-time setup):
```bash
cp ExtraFile/SIConfig.hpp.example Firmware/ScribitESP/SIConfig.hpp
cp ExtraFile/Mk4duoVersion.h.example Firmware/MK4duo/Mk4duoVersion.h
cp ExtraFile/ScribitVersion.hpp.example Firmware/ScribitESP/ScribitVersion.hpp
```

2. **Required libraries**:
```bash
cp -r ExtraFile/arduino-mqtt Firmware/ScribitESP/
cp -r ExtraFile/StepperDriver Firmware/ScribitESP/
```

### Required Tools

- **Docker** (recommended for building)
- **Python** (for flashing firmware)
- **WiFi connection** to Scribit device

---

## Building Firmware

### Option 1: Docker (Recommended)

**Build both firmwares:**

```bash
# ESP32 firmware
docker-compose -f docker/docker-compose.yml run --rm scribit-firmware \
  arduino-cli compile --fqbn briki:mbc-wb:mbc:mcu=esp \
  --output-dir /workspace/builds \
  /workspace/source/Firmware/ScribitESP/ScribitESP.ino

# SAMD21 firmware
docker-compose -f docker/docker-compose.yml run --rm scribit-firmware \
  arduino-cli compile --fqbn briki:mbc-wb:mbc:mcu=samd \
  --output-dir /workspace/builds \
  /workspace/source/Firmware/MK4duo/MK4duo.ino
```

**Output files:** `./docker/builds/*.bin`

### Option 2: Arduino IDE

**Setup Arduino IDE:**

1. Install **Arduino Legacy IDE 1.8.19**

2. Add board URLs in `File > Preferences`:
   ```
   https://www.briki.org/download/resources/package_briki_index.json
   https://dl.espressif.com/dl/package_esp32_dev_index.json
   ```

3. Install **Briki MBC-WB v2.0.0** board in Board Manager

4. Copy hardware overrides:
   ```bash
   # Partition tables
   cp ExtraFile/8MB_ffat.csv ~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/tools/partitions/
   cp ExtraFile/8MB_spiffs.csv ~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/tools/partitions/

   # SERCOM fix
   cp ExtraFile/SERCOM.cpp ~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/cores/samd21/
   ```

5. **Compile ESP32:**
   - Open `Firmware/ScribitESP/ScribitESP.ino`
   - Select board: `Tools > Board > Briki MBC-WB (mcu=esp)`
   - `Sketch > Export Compiled Binary`

6. **Compile SAMD21:**
   - Open `Firmware/MK4duo/MK4duo.ino`
   - Select board: `Tools > Board > Briki MBC-WB (mcu=samd)`
   - `Sketch > Export Compiled Binary`

---

## Deploying Firmware

### Step 1: Reset Scribit to AP Mode

1. Press and hold LED button (left side) for 5+ seconds
2. Release when LED starts pulsing white
3. Device broadcasts `ScribIt-XXXXXX` WiFi

### Step 2: Trigger OTA Mode

1. Connect to `ScribIt-XXXXXX` network
   - Password: `ScribItAP314` (or no password)

2. Send WiFi credentials to trigger OTA:
   ```bash
   curl -X POST http://192.168.240.1:8888 \
     -H "Content-Type: application/json" \
     -d '{"ssid":"YourWiFi","password":"YourPassword"}'
   ```

3. Device enters OTA mode:
   - LED flashes faster
   - Broadcasts `MBC-WB-XXXXXX` network

### Step 3: Flash Firmware via OTA

1. Connect to `MBC-WB-XXXXXX` network

2. Get espota.py tool:
   - **macOS/Linux:** `~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/tools/espota.py`
   - **Windows:** `%USERPROFILE%\AppData\Local\Arduino15\packages\briki\hardware\mbc-wb\2.0.0\tools\espota.py`

3. Flash ESP32 firmware:
   - Use OTA tool from Arduino IDE (Connect to `192.168.240.1` on port `3232` without a password.)
   - or these python commands:
   - `python ~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/tools/espota.py -i 192.168.240.1 -p 3232 -f docker/builds/ScribitESP.ino.bin`
   - `python ~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/tools/espota.py -i 192.168.240.1 -p 3232 -c -f docker/builds/MK4duo.ino.bin`
   - `python ~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/tools/espota.py -i 192.168.240.1 -p 3232 -s -f docker/builds/ScribitESP.ino.partitions.bin`

4. Device reboots automatically

**Note:** SAMD21 firmware is not typically updated via OTA (requires hardware programmer).

---

## Verification

### 1. Check Device Status

Connect to `ScribIt-XXXXXX` network and test:

```bash
curl http://192.168.240.1:8888/status
```

**Expected response:**
```json
{
  "state": "IDLE",
  "id": "xxxxxxxxxxxx"
}
```

### 2. Test G-code Upload

Create `test.gcode`:
```gcode
M17
G91
G1 F1000
G1 X10 Y10
G1 X-10 Y-10
M18
```

Upload:
```bash
curl -X POST http://192.168.240.1:8888/upload \
  -H "Content-Type: text/plain" \
  --data-binary @test.gcode
```

**Expected:** Motors move, LED shows printing state

---

## LED Status Indicators

| LED Pattern | State |
|-------------|-------|
| Pulsing white | AP mode (waiting for config) |
| Fast flashing | OTA mode |
| Double white flash → solid | Firmware update complete |
| Solid white | Idle, ready |
| Pulsing blue | Printing |
| Red | Error |

---

## Troubleshooting

### Build Errors

**Docker build fails:**
```bash
# Verify Docker is running
docker ps

# Rebuild image
docker build -f docker/Dockerfile -t scribit-firmware-builder .
```

**Arduino IDE compile error:**
- Ensure Briki MBC-WB v2.0.0 (not v2.1.7)
- Verify hardware overrides copied
- Check libraries are in correct location

### Deploy Errors

**Can't connect to ScribIt-XXXXXX:**
- Hold reset button longer (5-10 seconds)
- Check WiFi password: `ScribItAP314`

**OTA flash fails:**
- Verify device is in OTA mode (MBC-WB network)
- Check espota.py path is correct
- Ensure .bin file exists at specified path

**No response from device after flash:**
- Wait 30 seconds for boot
- Power cycle device
- Retry firmware flash

---

## Configuration Options

Edit `Firmware/ScribitESP/SIConfig.hpp` before building:

```cpp
// WiFi AP settings
#define SI_AP_SSID "ScribIt-XXXXXX"
#define SI_AP_PASSWORD "ScribItAP314"

// Local mode HTTP port
#define SI_HTTP_PORT 8888

// Enable/disable features
#define SI_LOCAL_MODE true
#define SI_CLOUD_MODE false
```

Rebuild firmware after configuration changes.

---

## Advanced: Direct Hardware Programming

For SAMD21 or if OTA fails, use hardware programmer:

**Required:**
- J-Link or compatible programmer
- Connection to SAMD debug pads

**Flash SAMD21:**
```bash
# Using OpenOCD
openocd -f interface/jlink.cfg -f target/at91samdXX.cfg \
  -c "program docker/builds/MK4duo.ino.bin verify reset exit"
```

Consult MBC-WB hardware manual for debug pad locations.
