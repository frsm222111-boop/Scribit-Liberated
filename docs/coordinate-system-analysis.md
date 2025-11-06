# Scribit Coordinate System Analysis

## Question
Does Scribit use a special coordinate system for its dual-string triangular setup, or does the firmware handle coordinate transformation?

## Answer: **Firmware handles it via steps-per-mm**

### Mechanism Configuration
- **Type:** `MECH_CARTESIAN` (Configuration_Basic.h:171, Configuration_Overall.h:57)
- **NOT using:** COREXY, Delta, or SCARA kinematics
- **No Transform function called** - coordinates map directly to motor steps

### How It Works

#### 1. G-code Input (Rectangular Coordinates)
Users provide standard Cartesian g-code:
```gcode
G1 X100 Y50  ; Move to position (100, 50) in rectangular coordinates
```

#### 2. Direct Mapping (No Coordinate Transform)
From `planner.cpp:2605`:
```cpp
set_machine_position_mm(raw[X_AXIS], raw[Y_AXIS], raw[Z_AXIS], raw[E_AXIS]);
```

No transformation function is called. X and Y coordinates go directly to motor controllers.

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

## Conclusion

**G-code uses standard rectangular (Cartesian) coordinates.**

The firmware treats Scribit as a Cartesian machine where:
- X/Y coordinates map directly to "Motor X" and "Motor Y"
- The calibration values (`axis_steps_per_mm`) encode the trigonometric relationship
- Users don't need to think about string lengths or triangular math
- All standard g-code tools work without modification

### For Phase 4 (G-code Conversion Tools)

✅ **Good news:** SVG-to-gcode converters can use standard Cartesian output
✅ No special coordinate system needed
✅ Just respect wall boundaries (typical ~200mm × 150mm)
✅ Calibration handles the rest

### Files Referenced
- `Firmware/MK4duo/Configuration_Overall.h:57` - MECH_CARTESIAN
- `Firmware/MK4duo/Configuration_Overall.h:335` - DEFAULT_AXIS_STEPS_PER_UNIT
- `Firmware/MK4duo/src/core/planner/planner.cpp:2605` - Direct position mapping
- `Firmware/MK4duo/src/core/mechanics/cartesian_mechanics.cpp` - No transform function
- `extrafile/autocal.gcode` - M92 calibration command
