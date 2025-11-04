# Scribit Local Mode Setup Guide

Simple guide to enable local g-code uploads on your Scribit device (no cloud required).

## What You'll Get

- Upload g-code files directly via HTTP
- No MQTT broker or cloud services needed
- Simple REST API at `http://192.168.240.1:8888`
- Works offline

## Prerequisites

- Scribit device with original firmware
- Computer with WiFi
- Python installed (for firmware flashing)
- [Download pre-compiled firmware](releases/) (coming soon)

## Step-by-Step Setup

### 1. Reset Your Scribit

- Press and hold the left side of LED button for 5+ seconds
- Device will restart
- Release the button
- LED starts pulsing white

### 2. Connect to Scribit WiFi

- Connect to `ScribIt-XXXXXX` WiFi network (No password or password: `ScribItAP314`)
- Open terminal/command prompt

### 3. Configure Network (Triggers OTA Mode)

Send WiFi credentials to trigger OTA mode:

```bash
curl -X POST http://192.168.240.1:8888 \
  -H "Content-Type: application/json" \
  -d '{"ssid":"YourWiFiName","password":"YourPassword"}'
```

**Expected:** LED flashes faster, device enters OTA mode

### 4. Connect to OTA Network

- Disconnect from ScribIt-XXXXXX
- Connect to `MBC-WB-XXXXXX` WiFi network

### 5. Flash Local Mode Firmware

<!-- TODO: include this in the release, it doesn't actually ship with arduino, it's a separate install from biki extension for arduino -->
Download espota.py tool (included with Arduino):
- macOS/Linux: `~/Library/Arduino15/packages/briki/hardware/mbc-wb/2.0.0/tools/espota.py`
- Windows: `%USERPROFILE%\AppData\Local\Arduino15\packages\briki\hardware\mbc-wb\2.0.0\tools\espota.py`

<!-- TODO: write a scrip that flashes all necessary binaries -->
Flash firmware:

```bash
python espota.py -i 192.168.240.1 -p 3232 -f ScribitESP.ino.bin
```

**Expected:** Upload progress bar, device reboots when complete

### 6. Verify Local Mode Active

- Device LED: double white flash → solid white
- Disconnect from MBC-WB network
- Connect to `ScribIt-XXXXXX` network

Test connection:

```bash
curl http://192.168.240.1:8888/status
```

**Expected response:**
```json
{"state":"IDLE","id":"xxxxxxxxxxxx"}
```

### 7. Upload G-code

Create test file `test.gcode`:
```gcode
G28
G0 X10 Y10
G0 X20 Y20
```

Upload:
```bash
curl -X POST http://192.168.240.1:8888/upload \
  -H "Content-Type: text/plain" \
  --data-binary @test.gcode
```

**Expected:** Motors move, LED changes to printing state

## Using Postman (Alternative to curl)

### Check Status
- Method: `GET`
- URL: `http://192.168.240.1:8888/status`
- Send

### Upload G-code
- Method: `POST`
- URL: `http://192.168.240.1:8888/upload`
- Headers: `Content-Type: text/plain`
- Body: Select "Binary" → Choose .gcode file
- Send

## API Reference

### GET /status

Returns current device state.

**Response:**
```json
{
  "state": "IDLE",  // IDLE, PRINTING, ERASING, BOOT, ERROR
  "id": "xxxxxxxxxxxx"
}
```

### POST /upload

Upload and execute g-code file.

**Request:**
- Content-Type: `text/plain`
- Body: G-code file content

**Success Response:**
```json
{
  "status": "uploaded",
  "size": 123
}
```

**Error Responses:**
- `400 Bad Request` - File too large (>1MB) or empty
- `409 Conflict` - Device not in IDLE state
- `500 Internal Server Error` - SPIFFS write failed

## Troubleshooting

### Can't connect to ScribIt WiFi
- Reset device again (hold button 5+ sec)
- Check WiFi password: `ScribItAP314`

### espota.py not found
- Install Arduino IDE
- Install Briki MBC-WB board package
- Or download Python script separately

### Upload returns 409 error
- Device is busy (printing/erasing)
- Wait for current operation to complete
- Check status endpoint first

### Motors don't move after upload
- Check g-code file syntax
- Verify file uploaded successfully (check response)
- Try simpler g-code (G28, G0 X10 Y10)

### Device stuck in boot loop
- Reflash firmware
- Check LED patterns in [LED status guide](docs/support-scribit-design/led-status.md)

## Advanced: Building from Source

See [README.md](README.md) for compilation instructions using Docker.

## Going Back to Original Firmware

Flash original firmware binaries (if you backed them up):

```bash
python espota.py -i 192.168.240.1 -p 3232 -f original-backup.bin
```

## FAQ

**Q: Does this void warranty?**
A: Scribit is discontinued. No warranty concerns.

**Q: Can I still use cloud features?**
A: No, local mode disables MQTT/cloud. Choose one or the other.

**Q: What g-code commands work?**
A: Standard movement (G0/G1), pen control (M18), homing (G28). See MK4duo docs.

**Q: Can I undo this?**
A: Yes, reflash original firmware if you have backup.

## Need Help?

- Check [PROGRESS_TRACKER.md](PROGRESS_TRACKER.md) for implementation details
- See [FIRMWARE_ANALYSIS.md](FIRMWARE_ANALYSIS.md) for technical info
- Open GitHub issue for problems

---

**Last Updated:** 2025-11-03
**Tested With:** Scribit Gen 1 hardware, Briki MBC-WB board
