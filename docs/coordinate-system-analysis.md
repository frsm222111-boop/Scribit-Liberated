# Scribit Coordinate System Analysis

## Question
Does Scribit use a special coordinate system for its dual-string triangular setup, or does the firmware handle coordinate transformation?

## Answer: **X/Y control string motors directly (CoreXY-style, NO transformation)**

### ⚠️ CRITICAL FINDING (from physical testing):
- **X axis = Left string motor** (direct control)
- **Y axis = Right string motor** (direct control)
- **G-code must use string-length coordinates, NOT Cartesian (x,y)**
- Firmware configured as `MECH_CARTESIAN` but behaves like raw motor control

### Mechanism Configuration
- **Type:** `MECH_CARTESIAN` (Configuration_Overall.h:57) - misleading name
- **NOT using:** COREXY, Delta, or SCARA kinematics
- **No Transform function called** - X/Y map directly to motor steps
- **Should be MECH_COREXY but isn't** - relies on pre-calculated coordinates

### How It ACTUALLY Works (Physical Test Results)

#### Test: `test-cartesian-rect-move.gcode`
```gcode
M17
G91
G1 F1000 X40    ; Only LEFT motor moved
G1 F1000 Y30    ; Only RIGHT motor moved
G1 F1000 X-40   ; Only LEFT motor moved (reverse)
G1 F1000 Y-30   ; Only RIGHT motor moved (reverse)
M18
```

**Result:** Each axis controls ONE motor independently. No Cartesian rectangle drawn.

#### Test: `test-diagonal.gcode`
```gcode
G1 F1000 X20 Y20  ; Both motors moved together
```

**Result:** Diagonal movement = both motors move simultaneously.

#### Test: `test-string-square.gcode`
```gcode
G1 X20, Y20, X-20, Y-20  ; Square in string-space
```

**Result:** Drew a tilted square (~45° rotated) because equal X/Y changes = diagonal pen movement.

### Coordinate Mapping (Confirmed)

From `planner.cpp:2605`:
```cpp
set_machine_position_mm(raw[X_AXIS], raw[Y_AXIS], raw[Z_AXIS], raw[E_AXIS]);
```

No transformation. **X and Y ARE the motor positions (string lengths).**

#### 3. The Secret: Steps-Per-MM Configuration

The "magic" happens in the motor calibration:

**From Configuration_Overall.h:335:**
```cpp
DEFAULT_AXIS_STEPS_PER_UNIT {30.5577, 30.5577, -22.222, 22.222, 625, 625, 625, 625, 625}
//                            ^X       ^Y        ^Z?     ^Z?
```

**Key insight:**
- X motor: 30.5577 steps/mm
- Y motor: 30.5577 steps/mm
- The **physical geometry** of the string system is accounted for in these calibration values
- As you change X/Y in g-code, each motor receives proportional step commands
- The triangular string physics naturally creates the desired rectangular motion

#### 4. Physical Geometry

```
    [Motor A]           [Motor B]
       |                    |
       |                    |
       +----string 1--------+
                 \          /
                  \        /
                   \ Pen  /
                    \    /
                     \  /
                      \/
                     [Pen]
```

When the pen moves in rectangular coordinates:
- **Move right (+X):** Motor A lengthens string, Motor B shortens string
- **Move down (+Y):** Both motors lengthen strings equally
- **Move diagonal:** Both motors adjust proportionally

The `axis_steps_per_mm` values encode the geometric relationship between:
- Rectangular position change (mm in X/Y)
- Required string length change (motor steps)

### Calibration Process

The auto-calibration (`extrafile/autocal.gcode`) measures:
1. Wall dimensions (150mm square pattern)
2. IMU angles at each corner
3. Cloud API calculates optimal `axis_steps_per_mm` values
4. These values are uploaded to firmware via M92 command

**From autocal.gcode:**
```gcode
M92 X29.6 Y-29.6  ; Set steps-per-mm (Y negative inverts direction)
```

### CoreXY vs Scribit

**CoreXY systems** (like H-Bot):
- Use coordinate transformation: `motor_a = x+y, motor_b = x-y`
- Requires `MECH_COREXY` firmware support
- Explicit math in motion planner

**Scribit approach:**
- Uses `MECH_CARTESIAN` (simpler)
- Triangular geometry encoded in calibration constants
- No explicit coordinate transform
- Calibration is more complex, but runtime is simpler

## Conclusion (**CORRECTED after physical testing**)

**G-code does NOT use Cartesian coordinates. It uses string-length coordinates.**

The firmware treats Scribit as direct motor control where:
- **X = Left string motor position/length**
- **Y = Right string motor position/length**
- **NO coordinate transformation** from Cartesian to string lengths
- Steps-per-mm calibration only affects motor scaling, NOT coordinate transformation

### For Phase 2 (Web UI) and Phase 4 (G-code Tools)

❌ **Cannot use standard SVG-to-gcode converters directly**
✅ **MUST implement Cartesian → string-length converter**
✅ **Need wall dimensions and motor positions for conversion**
✅ **This is what cloud calibration API provides**

### Required Conversion Math

Given:
- Cartesian position: `(x, y)`
- Left motor position: `(x1, y1)`
- Right motor position: `(x2, y2)`
- Current pen position in Cartesian: `(px, py)`

Calculate:
```
left_string_length = sqrt((px - x1)² + (py - y1)²)
right_string_length = sqrt((px - x2)² + (py - y2)²)

G-code output:
G1 X{left_string_length} Y{right_string_length}
```

This is why cloud calibration is crucial - it provides motor positions.

### Files Referenced
- `Firmware/MK4duo/Configuration_Overall.h:57` - MECH_CARTESIAN
- `Firmware/MK4duo/Configuration_Overall.h:335` - DEFAULT_AXIS_STEPS_PER_UNIT
- `Firmware/MK4duo/src/core/planner/planner.cpp:2605` - Direct position mapping
- `Firmware/MK4duo/src/core/mechanics/cartesian_mechanics.cpp` - No transform function
- `extrafile/autocal.gcode` - M92 calibration command
