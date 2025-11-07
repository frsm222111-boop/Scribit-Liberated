# CoreXY Implementation - Option 1

## Changes Made

### Configuration Change
**File:** `Firmware/MK4duo/Configuration_Overall.h`

**Before (line 57-58):**
```cpp
#define MECHANISM MECH_CARTESIAN
//#define MECHANISM MECH_COREXY
```

**After:**
```cpp
//#define MECHANISM MECH_CARTESIAN
#define MECHANISM MECH_COREXY
```

### What This Enables
Activates CoreXY kinematics transformation in the motion planner:

**Transform Location:** `src/core/planner/planner.cpp:1503-1504`
```cpp
#if CORE_IS_XY
  long da = dx + CORE_FACTOR * dy;  // Motor A = X + Y
  long db = dx - CORE_FACTOR * dy;  // Motor B = X - Y
#endif
```

**Inverse Transform:** `src/core/planner/planner.cpp:1323-1337`
```cpp
// Reconstruct Cartesian from motors:
// X = (Motor A + Motor B) / 2
// Y = (Motor A - Motor B) / 2
```

## How CoreXY Transform Works

### Math
Given Cartesian command `G1 X50 Y30`:
- `dx = 50 - current_x`
- `dy = 30 - current_y`
- `Motor A steps = (dx + dy) * steps_per_mm`
- `Motor B steps = (dx - dy) * steps_per_mm`

### Examples

**Horizontal Movement** `G1 X40 Y0` from origin:
- Motor A = 40 + 0 = 40mm
- Motor B = 40 - 0 = 40mm
- Both motors move same direction/amount

**Vertical Movement** `G1 X0 Y30` from origin:
- Motor A = 0 + 30 = 30mm
- Motor B = 0 - 30 = -30mm
- Motors move opposite directions

**Diagonal** `G1 X30 Y30` from origin:
- Motor A = 30 + 30 = 60mm
- Motor B = 30 - 30 = 0mm
- Only Motor A moves

## Test Files Created

### 1. test-corexy-cartesian.gcode
Tests basic rectangle drawing in Cartesian space.

**Expected Result:**
- Proper 40x30mm rectangle
- 90-degree corners
- Horizontal/vertical sides

**If Failed:**
- Tilted/rotated shape
- Indicates CoreXY not working or geometry mismatch

### 2. test-corexy-diagonal.gcode
Tests diagonal movements.

**Expected Result:**
- Clean 45-degree diagonal lines
- Proper motor coordination

## Next Steps

### 1. Build Firmware
```bash
cd docker
docker-compose up mk4duo-build
```

### 2. Flash to Device
Flash the new firmware to Scribit

### 3. Run Tests
Upload and execute test G-code files:
- `test-corexy-cartesian.gcode`
- `test-corexy-diagonal.gcode`

### 4. Evaluate Results

**If SUCCESS (proper Cartesian motion):**
- ✅ CoreXY matches Scribit geometry
- ✅ Can use standard SVG-to-G-code tools
- Move to next phase: SVG conversion

**If PARTIAL (motion correct but scaled/rotated):**
- Tune `CORE_FACTOR` in Configuration_Core.h
- Adjust `DEFAULT_AXIS_STEPS_PER_UNIT`
- May need geometry calibration

**If FAILURE (still wrong motion):**
- CoreXY doesn't match Scribit dual-string geometry
- Implement Option 2: Custom scribit_mechanics
- Need actual anchor positions and string-length math

## Configuration Parameters

### CORE_FACTOR
**File:** `Firmware/MK4duo/Configuration_Core.h:94`
**Current Value:** `1`

**Purpose:** Scaling factor in transform equations
- Standard CoreXY uses 1
- May need adjustment for Scribit

### AXIS_STEPS_PER_UNIT
**File:** `Firmware/MK4duo/Configuration_Overall.h:335`
**Current Values:**
```cpp
DEFAULT_AXIS_STEPS_PER_UNIT {30.5577, 30.5577, -22.222, 22.222, 625, 625, 625, 625, 625}
//                            ^X       ^Y
```

**Notes:**
- Currently calibrated for string-space
- May need recalibration for CoreXY
- Cloud calibration API may override these (M92 command)

## Potential Issues

### 1. Geometry Mismatch
**Problem:** CoreXY assumes perpendicular motors at same height.
**Scribit Reality:** V-shaped anchor points, may not be perpendicular.

**Solution if mismatch:**
- Implement custom kinematics (Option 2)
- Use proper string-length equations

### 2. Workspace Limits
**Problem:** Position limits configured for string-space.
**Impact:** Cartesian limits may be incorrect.

**Check:**
- X_MIN_POS, X_MAX_POS
- Y_MIN_POS, Y_MAX_POS
- May need adjustment

### 3. Homing
**Problem:** Homing assumes Cartesian motion.
**Impact:** May need to verify homing still works.

**Test:** Run G28 after flashing new firmware.

## Rollback Plan

If CoreXY doesn't work:

**Revert Configuration:**
```cpp
#define MECHANISM MECH_CARTESIAN
//#define MECHANISM MECH_COREXY
```

**Rebuild and reflash**

## References

- `docs/inverse_kinematics_plan.md` - Full analysis and all options
- `docs/coordinate-system-analysis.md` - Original problem documentation
- `Firmware/MK4duo/src/core/planner/planner.cpp` - Transform implementation
- `Firmware/MK4duo/src/core/mechanics/core_mechanics.cpp` - CoreXY mechanics class
