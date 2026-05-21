# Scribit User Guide

Complete guide for using Scribit in local mode - from SVG to drawing on the wall.

## Table of Contents
- [Quick Start](#quick-start)
- [Creating G-code from SVG](#creating-g-code-from-svg)
- [Connecting to Device](#connecting-to-device)
- [Uploading G-code](#uploading-gcode)
- [Device Control](#device-control)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

**5-Minute Setup:**

1. **Connect to Scribit WiFi:**
   - WiFi Name: `ScribIt-XXXXXX`
   - Password: `ScribItAP314` (or no password)

2. **Create G-code from SVG:**
   ```bash
   python3 tools/scribit_svg_to_gcode.py myimage.svg \
     -a 2250 -l 1270 -r 1270 \
     -o myimage.gcode
   ```

3. **Upload to device:**
   ```bash
   curl -X POST http://192.168.240.1:8888/upload \
     -H "Content-Type: text/plain" \
     --data-binary @myimage.gcode
   ```

4. **Watch it draw!**

---

## Creating G-code from SVG

### Basic Usage

```bash
python3 tools/scribit_svg_to_gcode.py INPUT.svg \
  --anchor-distance 2250 \
  --left-length 1270 \
  --right-length 1270 \
  --output OUTPUT.gcode
```

### Parameters Explained

| Parameter | Description | Example |
|-----------|-------------|---------|
| `INPUT.svg` | Your SVG file | `drawing.svg` |
| `-a, --anchor-distance` | Distance between top anchors (mm) | `2250` |
| `-l, --left-length` | Left string starting length (mm) | `1270` |
| `-r, --right-length` | Right string starting length (mm) | `1270` |
| `-o, --output` | Output G-code file | `output.gcode` |
| `-s, --scale` | Scale factor (optional) | `2.0` |
| `--offset-x` | Horizontal offset (mm, optional) | `50` |
| `--offset-y` | Vertical offset (mm, optional) | `-20` |
| `--no-optimize` | Disable path optimization | - |
| `-q, --quiet` | Suppress output | - |

### Measuring Your Scribit

**Anchor Distance:**
- Measure between the two top anchor points
- Typically: 2250mm (2.25 meters)

**String Lengths:**
- Measure current string lengths from anchors to robot
- For centered position: both ~1270mm
- **Tip:** Start centered for best results

### Scaling Your Drawing

```bash
# Make drawing 2x bigger
python3 tools/scribit_svg_to_gcode.py star.svg \
  -a 2250 -l 1270 -r 1270 -s 2.0 -o star.gcode

# Make drawing 0.5x smaller
python3 tools/scribit_svg_to_gcode.py logo.svg \
  -a 2250 -l 1270 -r 1270 -s 0.5 -o logo.gcode
```

### Positioning Your Drawing

```bash
# Move 100mm right, 50mm down
python3 tools/scribit_svg_to_gcode.py art.svg \
  -a 2250 -l 1270 -r 1270 \
  --offset-x 100 --offset-y 50 \
  -o art.gcode
```

### Multi-Color Drawings

**Automatic pen selection based on SVG colors:**

| SVG Color | Pen | Scribit Pen Color |
|-----------|-----|-------------------|
| Black (default) | 1 | Black |
| Red | 2 | Red |
| Blue | 3 | Blue |
| Green | 4 | Green |

**Example SVG with multiple colors:**
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <path d="M 50 50 L 100 100" stroke="black" fill="none"/>
  <path d="M 100 50 L 50 100" stroke="red" fill="none"/>
  <circle cx="75" cy="75" r="20" stroke="blue" fill="none"/>
</svg>
```

**Converter automatically:**
- Detects colors from `stroke`, `fill`, or `style` attributes
- Switches pens when needed
- Raises pen before switching

### SVG Preparation Tips

1. **Convert text to paths** - Text elements aren't supported
2. **Use strokes, not fills** - Line drawings work best
3. **Simplify complex paths** - Reduces G-code size
4. **Test small first** - Use `--scale 0.1` for quick tests
5. **Check colors** - Use black/red/blue/green for pen switching

### Supported SVG Features

✅ **Supported:**
- All path commands (M, L, H, V, C, S, Q, T, A, Z)
- Stroke colors (black, red, blue, green)
- Bezier curves and arcs
- Multiple paths

❌ **Not Supported:**
- Text elements (convert to paths first)
- SVG transforms (apply before exporting)
- Fill patterns/gradients
- Embedded images

---

## Connecting to Device

### Initial Connection

1. **Power on Scribit** - LED should pulse white

2. **Find WiFi network:**
   - Look for `ScribIt-XXXXXX` network
   - XXXXXX = device serial number

3. **Connect:**
   - Password: `ScribItAP314` (or try no password)
   - Device IP: Always `192.168.240.1`
   - HTTP Port: `8888`

### LED Status Guide

| LED Pattern | Device State |
|-------------|--------------|
| Pulsing white | Idle, ready for commands |
| Pulsing blue | Printing/drawing |
| Pulsing green | Erasing |
| Solid white | Connected, idle |
| Red flash | Error occurred |
| Fast flashing | OTA/firmware update mode |

### Verify Connection

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

---

## Uploading G-code

### Method 1: Using curl (Command Line)

```bash
curl -X POST http://192.168.240.1:8888/upload \
  -H "Content-Type: text/plain" \
  --data-binary @your_file.gcode
```

**Success response:**
```json
{
  "status": "uploaded",
  "size": 1234
}
```

### Method 2: Using Postman (GUI)

1. **Create new request:**
   - Method: `POST`
   - URL: `http://192.168.240.1:8888/upload`

2. **Set headers:**
   - Key: `Content-Type`
   - Value: `text/plain`

3. **Set body:**
   - Select `Binary`
   - Choose your `.gcode` file

4. **Send**

### Method 3: Using Python Script

```python
import requests

# Read G-code file
with open('drawing.gcode', 'rb') as f:
    gcode = f.read()

# Upload to device
response = requests.post(
    'http://192.168.240.1:8888/upload',
    headers={'Content-Type': 'text/plain'},
    data=gcode
)

print(response.json())
```

### Upload Limits

- **Max file size:** 1MB
- **File format:** Plain text G-code
- **Device must be:** IDLE state (not printing/erasing)

---

## Device Control

### API Endpoints

#### GET /status

Check current device state.

```bash
curl http://192.168.240.1:8888/status
```

**Response:**
```json
{
  "state": "IDLE",  // IDLE, PRINTING, ERASING, BOOT, ERROR
  "id": "device_serial_number"
}
```

**States:**
- `IDLE` - Ready for commands
- `PRINTING` - Currently drawing
- `ERASING` - Currently erasing
- `BOOT` - Starting up
- `ERROR` - Error occurred

#### POST /upload

Upload and execute G-code.

```bash
curl -X POST http://192.168.240.1:8888/upload \
  -H "Content-Type: text/plain" \
  --data-binary @file.gcode
```

**Success (200):**
```json
{
  "status": "uploaded",
  "size": 1234
}
```

**Errors:**
- `400` - File too large (>1MB) or empty
- `409` - Device busy (not IDLE)
- `500` - Storage write failed

#### POST /pause

Pause current operation.

```bash
curl -X POST http://192.168.240.1:8888/pause
```

**Response:**
```json
{
  "status": "paused"
}
```

#### POST /resume

Resume paused operation.

```bash
curl -X POST http://192.168.240.1:8888/resume
```

**Response:**
```json
{
  "status": "resumed"
}
```

#### POST /stop

**Note: Not yet implemented - planned for future release**

Stop current operation and return home.

```bash
curl -X POST http://192.168.240.1:8888/stop
```

**Response:**
```json
{
  "status": "stopped"
}
```

---

## Complete Workflow Example

```bash
# 1. Prepare SVG
# (Edit your drawing in Inkscape/Illustrator)

# 2. Convert to G-code
python3 tools/scribit_svg_to_gcode.py artwork.svg \
  -a 2250 -l 1270 -r 1270 \
  -s 1.5 \
  -o artwork.gcode

# 3. Connect to Scribit WiFi
# (Connect to ScribIt-XXXXXX network)

# 4. Check device status
curl http://192.168.240.1:8888/status

# 5. Upload and draw
curl -X POST http://192.168.240.1:8888/upload \
  -H "Content-Type: text/plain" \
  --data-binary @artwork.gcode

# 6. Monitor status
curl http://192.168.240.1:8888/status

# 7. Pause if needed
curl -X POST http://192.168.240.1:8888/pause

# 8. Resume
curl -X POST http://192.168.240.1:8888/resume
```

---

## Troubleshooting

### Can't Connect to WiFi

**Problem:** ScribIt-XXXXXX network not visible

**Solutions:**
- Press and hold LED button for 5+ seconds
- Wait for LED to pulse white
- Check WiFi password: `ScribItAP314`
- Try connecting without password

### Upload Fails with 409 Error

**Problem:** Device returns `409 Conflict`

**Cause:** Device is busy (printing/erasing)

**Solutions:**
```bash
# Check status
curl http://192.168.240.1:8888/status

# Stop current operation
curl -X POST http://192.168.240.1:8888/stop

# Wait for IDLE, then upload
curl http://192.168.240.1:8888/status
curl -X POST http://192.168.240.1:8888/upload \
  -H "Content-Type: text/plain" \
  --data-binary @file.gcode
```

### Upload Fails with 400 Error

**Problem:** File too large or empty

**Solutions:**
- Check file size: `ls -lh file.gcode`
- Limit: 1MB (1,048,576 bytes)
- If too large, simplify SVG or reduce scale

### Drawing Appears Stretched

**Problem:** Drawing doesn't match SVG proportions

**Cause:** Aspect ratio compensation needed

**Solutions:**
- Compensated automatically in latest version (0.893x width, 1.25x height)
- Test with `test_square.svg` and measure
- Adjust compensation factors in script if needed

### Pen Doesn't Touch Wall

**Problem:** Pen doesn't make contact

**Cause:** Not properly initialized or wrong pen commands

**Solutions:**
- Ensure G-code starts with initialization:
  ```gcode
  M17
  G77
  G90
  G1 Z160
  G91
  G1 Z-70
  ```
- Regenerate G-code from SVG converter
- See [GCODE_REFERENCE.md](GCODE_REFERENCE.md) for pen control details

### Wrong Pen Selected

**Problem:** Different color pen than expected

**Solutions:**
- Check SVG colors match: black/red/blue/green
- Converter only recognizes these 4 colors
- All other colors default to pen 1 (black)

### Device Not Responding

**Problem:** No response from API endpoints

**Solutions:**
1. Check WiFi connection
2. Verify IP: `ping 192.168.240.1`
3. Power cycle device (unplug, wait 10sec, plug in)
4. Re-flash firmware if persistent

---

## Tips & Best Practices

1. **Always start centered** - Easier to calculate string lengths
2. **Test small first** - Use `--scale 0.1` before full size
3. **Monitor with /status** - Check progress during long drawings
4. **Keep G-code under 500KB** - Faster upload and execution
5. **Use path optimization** - Default enabled, saves time
6. **Back up working files** - Save SVG, G-code, and measurements
7. **Measure twice, draw once** - Verify anchor distance and string lengths
8. **Use pause/resume** - Don't stop mid-drawing, pause instead

---

## Releasing a New Version

See [VERSION.md](VERSION.md) for complete release workflow including:
- Bumping version in `gui-app/package.json`
- Generating firmware version headers
- Building and tagging releases

---

## Support

For firmware build/deployment issues, see [FIRMWARE.md](FIRMWARE.md)

For G-code reference and pen control, see [GCODE_REFERENCE.md](GCODE_REFERENCE.md)

For hardware/mechanical issues, check docs in `docs/support-scribit-design/`
