# Scribit Cloud Calibration API Analysis

## Overview

The cloud calibration is **critical** for accurate drawing. It converts 4 IMU pitch readings into a starting position (G92 + G1 command).

## How Crucial Is It?

**VERY CRUCIAL** - Without calibration:
- Device doesn't know its starting position relative to the wall
- Drawings will be offset, skewed, or wrong size
- Motors won't move correct distances

**However:** Once calibrated, the position persists until device is moved to a different wall.

## Calibration Flow

### 1. User Initiates (via MQTT)
```json
Topic: "tin/<deviceID>/calibration"
Payload: {"wallId": 1}
```

### 2. Firmware Downloads autocal.gcode
```cpp
SI_CALIBRATION_GCODE_URL = "https://xxxxxxx/autocal.GCODE"
```
- Device downloads auto-calibration g-code from cloud
- G-code moves pen in 150mm square pattern
- Reads IMU pitch at 4 corners using M777

### 3. Collect IMU Data
```cpp
SI_CALIBRATION_POINT_NUMBER = 4  // 4 corner measurements
```

From `autocal.gcode`:
- Corner 1 (top-right): M777 → pitch angle
- Corner 2 (bottom-right): M777 → pitch angle
- Corner 3 (bottom-left): M777 → pitch angle
- Corner 4 (top-left): M777 → pitch angle

IMU readings are stored as `int16_t` (angle * 10), e.g., 45.3° → 453

### 4. Send to Cloud API

**Endpoint:** `SI_CALIBRATION_URL` (currently empty/hidden)

**Request:**
```http
POST <SI_CALIBRATION_URL> HTTP/1.1
Host: <api_host>
Content-Type: application/json
accesstoken: cmJqv3ah7nPj3OVGoNyevDXs7LwNJbIW

{
  "sn": "aabbccddeeff",
  "wallId": 1,
  "scans": [453, 461, 448, 455]
}
```

**Parameters:**
- `sn`: Device serial number (6-byte MAC address in hex)
- `wallId`: Wall identifier (1-255) for multi-wall setups
- `scans`: Array of 4 IMU pitch readings (tenths of degrees)

**Timeout:** 30 seconds (`SI_CALIBRATION_API_TIMEOUT`)

### 5. Cloud Processing (Black Box)

**Input:** 4 IMU pitch angles + wall ID
**Output:** G-code commands to set starting position

**What the API likely calculates:**
1. **Wall dimensions** - Width and height from IMU angle changes
2. **Wall orientation** - Is wall perfectly vertical? Any tilt?
3. **String lengths** - Current A/B motor positions
4. **Coordinate transform** - Mapping from motor space to Cartesian space
5. **Starting position** - Where pen currently is in X/Y coordinates
6. **Steps-per-mm calibration** - Optimal values for this wall geometry

### 6. API Response

**Success (200 OK):**
```json
{
  "command": "G92 X0 Y0\nG1 X10 Y20 F1000"
}
```

**Response Format:**
- Contains `G92` command: Set current position
- Contains `G1` command: Move to home/starting position
- Commands separated by `\n` or `;`

**From code analysis:**
```cpp
// Parse response (SIFileDownloader.cpp:321-323)
uint8_t cmdStart = line.indexOf("G92");
uint8_t cmdEnd = line.indexOf("\"", cmdStart);
startPositionGcode = line.substring(cmdStart, cmdEnd);

// Extract commands (ScribIt.cpp:807-808)
String cmd1 = startPosition.substring(startPosition.indexOf("G92"), startPosition.indexOf(";"));
String cmd2 = startPosition.substring(startPosition.indexOf("G1"));

// Send to SAMD (ScribIt.cpp:810-812)
sm.forceLineToSAMD(cmd1);  // G92 X0 Y0
delay(500);
sm.forceLineToSAMD(cmd2);  // G1 X10 Y20 F1000
```

**Error responses:**
- `404`: API endpoint not found
- Response contains `"err"`: Lambda/API error
- Response missing `"G1"`: Calibration failed, retry

### 7. Retry Logic

```cpp
CALIBRATION_ATTEMPTS_LIMIT = 2
```

If response contains `G1` but calibration not perfect:
- Retry up to 2 times
- Re-run autocal.gcode
- Collect new IMU readings
- Send to API again

## Can We Mock It?

### Option 1: Simple Mock (Basic Functionality)

**YES - Use default starting position**

```cpp
// HTTP endpoint: POST /calibrate
// Returns fixed response:
{
  "command": "G92 X0 Y0\nG1 X100 Y75 F1000"
}
```

**Pros:**
- ✅ Device will accept it and continue
- ✅ Provides a "reasonable" starting position
- ✅ Works if user manually positions pen at expected location

**Cons:**
- ❌ Won't adapt to different wall sizes
- ❌ Won't correct for wall tilt/skew
- ❌ User must manually measure and position pen
- ❌ Drawings may be offset or distorted

### Option 2: Basic Calibration Math (Better)

**YES - Implement simplified calibration**

Calculate based on IMU readings:

```python
def simple_calibration(scans, wall_id):
    # scans = [top_right, bottom_right, bottom_left, top_left]

    # Rough wall dimensions from angle changes
    # (This is oversimplified - real math involves trigonometry)
    vertical_change = abs(scans[1] - scans[0])  # Right edge
    horizontal_change = abs(scans[2] - scans[1])  # Bottom edge

    # Estimate wall size (rough approximation)
    wall_height = vertical_change * 10  # mm (needs calibration constant)
    wall_width = horizontal_change * 10  # mm

    # Default: assume pen is at top-right after autocal
    # Return command to set this as origin
    return {
        "command": f"G92 X0 Y0\nG1 X{wall_width/2} Y{wall_height/2} F1000"
    }
```

**Pros:**
- ✅ Adapts to wall size somewhat
- ✅ Better than fixed position
- ✅ Can be improved over time

**Cons:**
- ❌ Missing proprietary calibration constants
- ❌ Doesn't handle wall tilt/skew
- ❌ Less accurate than cloud API

### Option 3: Manual Calibration Helper (Most Practical)

**YES - Let user provide measurements**

Web UI prompts:
1. Wall width (mm)
2. Wall height (mm)
3. Pen starting position X (mm from left)
4. Pen starting position Y (mm from top)

Generate command:
```gcode
G92 X{start_x} Y{start_y}
G1 X{wall_width/2} Y{wall_height/2} F1000
```

**Pros:**
- ✅ Most practical for local mode
- ✅ User knows their wall size
- ✅ No cloud dependency
- ✅ Works reliably

**Cons:**
- ❌ Manual measurement required
- ❌ No IMU-based verification
- ❌ User must position pen accurately

### Option 4: Skip Calibration (Risky)

**NOT RECOMMENDED**

Use M92 from autocal.gcode:
```gcode
M92 X29.6 Y-29.6  ; Set default steps/mm
```

And assume position:
```gcode
G92 X0 Y0  ; Current position is origin
```

**Pros:**
- ✅ Simple

**Cons:**
- ❌ Wrong coordinate system
- ❌ Drawings will be completely wrong
- ❌ Wasted materials
- ❌ Frustrating user experience

## Recommendation for Local Mode

### Phase 2 Web UI Implementation

**Hybrid Approach:**

1. **Manual Calibration Helper**
   - User inputs wall dimensions (width × height)
   - User positions pen at top-right corner
   - Web UI generates: `G92 X0 Y0\nG1 X100 Y75 F1000`
   - Send via `/command` endpoint

2. **Store Calibration**
   - Save calibration per wall (wall ID 1-5)
   - User labels walls: "Living Room", "Bedroom", etc.
   - Recall calibration when switching walls

3. **Optional: IMU Display**
   - Add `/imu` endpoint that sends M777 and returns pitch
   - Show real-time IMU readings in web UI
   - Helps user verify pen contact with wall
   - Advanced users can manually compare readings

4. **Visual Guide**
   - Animated instructions in web UI
   - "Place pen in top-right corner"
   - "Press pen firmly against wall"
   - "Click Calibrate when ready"

### Example Web UI Flow

```javascript
// Manual calibration
const calibrate = async () => {
  const width = parseInt(document.getElementById('wall-width').value);
  const height = parseInt(document.getElementById('wall-height').value);

  // Assume user positioned pen at top-right
  const calibCmd = `G92 X0 Y0\nG1 X${width/2} Y${height/2} F1000`;

  await fetch('http://192.168.240.1:8888/command', {
    method: 'POST',
    body: calibCmd
  });

  // Save to localStorage
  localStorage.setItem('calibration', JSON.stringify({width, height}));
};
```

## Critical Files

**ESP32 Firmware:**
- `ScribIt.cpp:735-764` - `startCalibration()` function
- `ScribIt.cpp:789-845` - `completeCalibration()` function
- `SIFileDownloader.cpp:247-346` - `getStartingPosition()` API call
- `SIConfig.hpp:43-46` - Calibration constants

**SAMD21 Firmware:**
- `Firmware/MK4duo/src/core/commands/gcode/scribit/m777.h` - IMU reading
- `Firmware/MK4duo/Configuration_Overall.h:335` - Steps-per-mm defaults

**Cloud API:**
- Endpoint URL: Hidden in `SI_CALIBRATION_URL` (currently empty)
- Auth token: `cmJqv3ah7nPj3OVGoNyevDXs7LwNJbIW` (hardcoded)
- G-code source: `SI_CALIBRATION_GCODE_URL` (autocal.gcode)

## Summary

### Importance: **8/10 Critical**
- Required for accurate drawings
- One-time per wall
- Can be approximated but not perfectly

### Mockability: **7/10 Feasible**
- Simple mock: Easy but inaccurate
- Manual helper: Practical and works
- Full reimplementation: Requires reverse engineering

### Recommended Approach: **Manual Calibration Helper**
- User provides wall dimensions
- Simple G92/G1 commands
- Good enough for local mode
- Can be enhanced later with IMU readings
