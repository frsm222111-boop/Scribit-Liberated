# Verification Test Plan

Tests to verify coordinate system and calibration findings before implementing Phase 2.

## Test Files Overview

| Test | Purpose | Drawing | What to Observe |
|------|---------|---------|-----------------|
| `test-cartesian-rect-draw.gcode` | Verify Cartesian coordinates | ✅ Yes | 40×30mm rectangle shape |
| `test-cartesian-rect-move.gcode` | Verify motor movements | ❌ No | Motor sounds (4 sides) |
| `test-g92-calibration-draw.gcode` | Test manual calibration | ✅ Yes | Centered cross (+) |
| `test-g92-calibration-move.gcode` | Test position reset | ❌ No | Movement pattern |
| `test-m92-scale-draw.gcode` | Test scale adjustment | ✅ Yes | 3 lines (different lengths) |
| `test-m92-scale-move.gcode` | Test scale via sound | ❌ No | Motor duration changes |
| `test-m777-imu-read.gcode` | Test IMU readings | ❌ No | Serial output |
| `test-m777-imu-draw.gcode` | IMU + visual marks | ✅ Yes | 4 dots + serial output |

## Running Tests

### Prerequisites
1. Scribit powered on, firmware flashed
2. Pen installed (for drawing tests)
3. Connected to ScribIt-... WiFi
4. Serial monitor ready (for IMU tests)

### Upload Method
```bash
curl -X POST http://192.168.240.1:8888/upload \
  -H "Content-Type: text/plain" \
  --data-binary @test-cartesian-rect-draw.gcode
```

### Safety Notes
- All tests use **relative positioning (G91)** for safety
- Small movements (20-50mm) to avoid hitting edges
- Tests assume pen starts near center of wall
- Movement-only tests won't mark the wall

## Test Details

### 1. Cartesian Coordinate System Tests

**Files:**
- `test-cartesian-rect-draw.gcode` (with drawing)
- `test-cartesian-rect-move.gcode` (movement only)

**Hypothesis:** Scribit uses standard Cartesian coordinates (not special triangular system)

**Expected Results:**
- ✅ **PASS:** Rectangle drawn is clean, corners are 90°, sides are straight
- ✅ **PASS:** 4 distinct motor movements heard (right, down, left, up)
- ❌ **FAIL:** Rectangle is skewed, distorted, or diagonal
- ❌ **FAIL:** Motors move in unexpected pattern

**What This Proves:**
- PASS → G-code uses standard X/Y Cartesian coordinates
- PASS → SVG→gcode converters can use standard Cartesian output
- FAIL → Would need coordinate transformation (unlikely based on code)

### 2. G92 Calibration Tests

**Files:**
- `test-g92-calibration-draw.gcode` (with drawing)
- `test-g92-calibration-move.gcode` (movement only)

**Hypothesis:** G92 command can set current position (basis for manual calibration)

**Expected Results:**
- ✅ **PASS:** Cross (+) drawn centered at starting position
- ✅ **PASS:** 6 movements (up, down, center, right, left, center) heard
- ✅ **PASS:** Motors return to exact starting position
- ❌ **FAIL:** Cross is offset or incomplete
- ❌ **FAIL:** Position tracking is lost

**What This Proves:**
- PASS → Manual calibration approach will work in Phase 2
- PASS → Web UI can send `G92 X<val> Y<val>` to set starting position
- FAIL → Would need different calibration approach

**Phase 2 Implications:**
```javascript
// If G92 works, manual calibration is simple:
const calibrate = () => {
  const width = 200;  // User measured wall
  const height = 150;

  // User positions pen at top-right corner
  await fetch('/command', {
    method: 'POST',
    body: 'G92 X0 Y0'  // Set current position as origin
  });

  // Now drawings will be correctly positioned
};
```

### 3. M92 Steps-Per-MM Tests

**Files:**
- `test-m92-scale-draw.gcode` (with drawing)
- `test-m92-scale-move.gcode` (movement only)

**Hypothesis:** M92 command can adjust scale without cloud API

**Expected Results:**
- ✅ **PASS:** Three horizontal lines drawn:
  - Line 1: 30mm (baseline)
  - Line 2: ~45mm (50% longer)
  - Line 3: 30mm (restored)
- ✅ **PASS:** Second motor movement sounds noticeably longer
- ❌ **FAIL:** All lines same length
- ❌ **FAIL:** No difference in motor duration

**What This Proves:**
- PASS → Users can fine-tune scale without cloud calibration
- PASS → Web UI could offer "scale calibration" feature
- FAIL → Must rely on default steps_per_mm values

**Phase 2 Implications:**
If works, could add advanced feature:
```javascript
// Scale calibration helper
const calibrateScale = (measured, expected) => {
  const currentSteps = 30.5577;
  const scaleFactor = expected / measured;
  const newSteps = currentSteps * scaleFactor;

  await fetch('/command', {
    method: 'POST',
    body: `M92 X${newSteps} Y${newSteps}`
  });
};

// Example: "My 100mm line measured 95mm"
calibrateScale(95, 100);  // Adjust scale +5%
```

### 4. M777 IMU Reading Tests

**Files:**
- `test-m777-imu-read.gcode` (no drawing)
- `test-m777-imu-draw.gcode` (with marking dots)

**Hypothesis:** Can read IMU pitch angles locally (without cloud)

**Expected Results:**
- ✅ **PASS:** Serial output shows 4 readings like: `OK I:45.3`
- ✅ **PASS:** 4 dots drawn on wall correlating with IMU readings
- ⚠️ **PARTIAL:** See "IMU unavailable" error (hardware issue, not firmware)
- ❌ **FAIL:** No M777 response at all

**What This Proves:**
- PASS → Can display real-time IMU in web UI
- PASS → Could implement simplified local calibration algorithm
- PARTIAL → IMU hardware issue (expected on some units)
- FAIL → M777 command not working

**Phase 2 Implications:**
```javascript
// Optional IMU display in web UI
const readIMU = async () => {
  await fetch('/command', {method: 'POST', body: 'M777'});

  // Poll status for IMU reading (would need /imu endpoint)
  const response = await fetch('/status');
  // Display: "IMU Pitch: 45.3° - Pen touching wall ✓"
};
```

**Advanced (Future):**
If IMU works reliably, could implement basic calibration:
```python
# Simplified local calibration (no cloud)
def basic_calibration(imu_readings):
    # imu_readings = [top_right, bottom_right, bottom_left, top_left]

    # Rough wall height from vertical angle change
    vertical_delta = abs(imu_readings[1] - imu_readings[0])
    wall_height = vertical_delta * CALIBRATION_CONSTANT

    # Rough wall width from horizontal angle change
    horizontal_delta = abs(imu_readings[2] - imu_readings[1])
    wall_width = horizontal_delta * CALIBRATION_CONSTANT

    return (wall_width, wall_height)
```

## Interpreting Results

### Success Criteria

All tests should PASS for Phase 2 to proceed as planned:

1. **Cartesian Tests PASS** → Standard g-code tools work
2. **G92 Tests PASS** → Manual calibration feasible
3. **M92 Tests PASS** → Scale adjustment possible (bonus)
4. **M777 Tests PASS/PARTIAL** → IMU display possible (optional)

### If Tests Fail

| Test Failed | Impact | Mitigation |
|-------------|--------|------------|
| Cartesian | HIGH | Need coordinate transform in web UI |
| G92 | HIGH | Need different calibration approach |
| M92 | LOW | Use default steps_per_mm only |
| M777 | LOW | Skip IMU features, manual only |

## Troubleshooting

### Test doesn't execute
- Check WiFi connection: `ping 192.168.240.1`
- Check device state: `curl http://192.168.240.1:8888/status`
- Must be in IDLE state, not PRINTING/ERASING
- Wait for previous test to complete

### Motors don't move
- LED not solid white → Device not in IDLE
- Check M17 command works (enable motors)
- Verify SAMD21 communication working

### Drawing doesn't appear
- Pen not installed or dried out
- M18 E (pen down) not working
- Try movement-only version to verify motors work

### IMU returns "unavailable"
- Known issue on some units (hardware)
- Not critical for Phase 2
- Can still implement manual calibration

### Rectangle is wrong size but correct shape
- Expected! Device not calibrated yet
- Shape matters, not absolute size
- Size will be correct after proper calibration

### Rectangle is skewed/distorted
- Unexpected! May indicate:
  - Wall not vertical
  - Strings tangled
  - Wrong steps_per_mm loaded
  - Coordinate system issue (review findings)

## Next Steps After Testing

### All Tests Pass ✅
- Proceed with Phase 2 web UI
- Implement manual calibration form
- Add `/command` endpoint for G92/M92
- Optional: Add IMU display

### Some Tests Fail ❌
- Document failures in progress tracker
- Re-evaluate Phase 2 approach
- May need firmware modifications
- Consider alternative calibration methods

## Automated Testing (Future)

Could create test suite:
```bash
#!/bin/bash
# run-all-tests.sh

for test in test-*.gcode; do
  echo "Running $test..."
  curl -X POST http://192.168.240.1:8888/upload \
    -H "Content-Type: text/plain" \
    --data-binary @$test

  # Wait for completion
  while true; do
    state=$(curl -s http://192.168.240.1:8888/status | jq -r .state)
    if [ "$state" == "IDLE" ]; then break; fi
    sleep 1
  done

  echo "$test complete"
  sleep 2
done
```

## Test Results Log Template

```markdown
## Test Results - YYYY-MM-DD

**Environment:**
- Firmware: [version/commit]
- Wall: [material, size]
- Pen: [type, color]

**Test 1: Cartesian Rectangle (Draw)**
- Status: PASS/FAIL
- Observations: [rectangle quality, dimensions]
- Issues: [any problems]

**Test 2: Cartesian Rectangle (Move)**
- Status: PASS/FAIL
- Observations: [motor sounds, pattern]
- Issues: [any problems]

[... repeat for all tests ...]

**Conclusions:**
- Ready for Phase 2: YES/NO
- Concerns: [any issues to address]
- Recommendations: [next steps]
```
