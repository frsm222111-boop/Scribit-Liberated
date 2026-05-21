# CoreXY Test Failed - Root Cause Analysis

## Test Results
Device moves "more straight but not completely" - indicates CoreXY is partially working but **fundamentally incompatible** with Scribit's geometry.

## Why CoreXY Doesn't Work

### CoreXY Assumption (WRONG for Scribit)
CoreXY uses **linear** transform with **constant** factor:
```
Motor A = X + CORE_FACTOR * Y
Motor B = X - CORE_FACTOR * Y
```

Where `CORE_FACTOR` is **constant** (we set it to 1).

### Scribit Reality (Nonlinear Geometry)
Scribit uses **string lengths** with **variable** relationship:
```
Left String  = sqrt((X - x1)² + (Y - y1)²)
Right String = sqrt((X - x2)² + (Y - y2)²)
```

Where (x1,y1) and (x2,y2) are anchor positions.

### The Problem
The ratio between left/right motor movement **changes continuously** based on pen position:
- When pen is far left: left string long, right string short
- When pen is center: strings similar length
- When pen is far right: left string short, right string long

This is a **nonlinear** relationship that cannot be expressed as `X + constant*Y`.

## How Original Firmware Worked

### Discovery: NO Transformation in Firmware
The firmware **NEVER** did Cartesian → string conversion!

**Evidence:**
1. `MECH_CARTESIAN` mode has **no transform function**
2. `cartesian_mechanics.cpp:109-113` directly maps positions:
   ```cpp
   cartesian_position[X_AXIS] = planner.get_axis_position_mm(X_AXIS);
   cartesian_position[Y_AXIS] = planner.get_axis_position_mm(Y_AXIS);
   // No transformation!
   ```
3. G-code X/Y values **ARE** the string lengths

### Where Transform Happened: Cloud/App Side

**The conversion was done BEFORE G-code was sent to device:**

1. **User draws/selects artwork** in app
2. **App or cloud API converts** Cartesian SVG → string-length G-code
3. **Firmware receives** G-code already in string-space
4. **Device executes** string movements directly

**Calibration's Role:**
- Cloud calibration (autocal.gcode) measures wall geometry
- Returns `G92` command to set starting position
- Provides anchor positions for conversion math
- App uses this data for Cartesian → string conversion

## Why We Were Confused

### The Misleading `steps_per_mm`
From coordinate-system-analysis.md:
> "The physical geometry of the string system is accounted for in these calibration values"

**This is WRONG.** The `steps_per_mm` values only:
- Convert motor steps to string length (mm)
- **NOT** Cartesian to string transform
- Just motor scaling, not kinematics

### The Real System Architecture

```
[User Input]
    ↓
[SVG/Cartesian Drawing]
    ↓
[Cloud API / App]  ← Uses calibration data
    ↓ (Converts Cartesian → String Lengths)
    ↓
[G-code in String-Space]
    ↓
[Firmware] ← No transformation, direct motor control
    ↓
[Motors execute string movements]
```

## What We Need: Option 2 (Custom Kinematics)

Since CoreXY failed, we must implement proper string-length kinematics.

### Required Implementation

#### 1. Add Scribit-Specific Mechanics Class
Create `scribit_mechanics.cpp` with proper transforms:

```cpp
void Scribit_Mechanics::Transform(const float (&cartesian)[XYZ]) {
    // Cartesian → String lengths
    float dx1 = cartesian[X_AXIS] - anchor_left_x;
    float dy1 = cartesian[Y_AXIS] - anchor_left_y;
    float dx2 = cartesian[X_AXIS] - anchor_right_x;
    float dy2 = cartesian[Y_AXIS] - anchor_right_y;

    delta[A_AXIS] = sqrt(dx1*dx1 + dy1*dy1);  // Left string
    delta[B_AXIS] = sqrt(dx2*dx2 + dy2*dy2);  // Right string
    delta[C_AXIS] = cartesian[Z_AXIS];
}

void Scribit_Mechanics::InverseTransform(float L1, float L2, float cartesian[XYZ]) {
    // String lengths → Cartesian (circle intersection)
    // Solve: (X - x1)² + (Y - y1)² = L1²
    //        (X - x2)² + (Y - y2)² = L2²

    // [Complex math - see delta_mechanics for reference]
}
```

#### 2. Get Anchor Positions
We need actual anchor coordinates. Sources:
- Measure physically
- Extract from calibration API response
- Reverse engineer from working drawings

#### 3. Integration
Follow Delta mechanics pattern:
- Add `MECH_SCRIBIT` to macros.h
- Call Transform() in planner.cpp before buffer_line
- Handle position updates with InverseTransform()

## Alternative: External Preprocessing (Easier)

Since conversion was originally done externally, we can:

### Python Kinematics Library
```python
import math

class ScribitKinematics:
    def __init__(self, anchor_left, anchor_right):
        self.anchor_left = anchor_left   # (x1, y1)
        self.anchor_right = anchor_right # (x2, y2)

    def cartesian_to_strings(self, x, y):
        """Convert Cartesian (x,y) to string lengths (L1, L2)"""
        dx1 = x - self.anchor_left[0]
        dy1 = y - self.anchor_left[1]
        dx2 = x - self.anchor_right[0]
        dy2 = y - self.anchor_right[1]

        L1 = math.sqrt(dx1**2 + dy1**2)
        L2 = math.sqrt(dx2**2 + dy2**2)

        return L1, L2

    def convert_gcode(self, input_gcode):
        """Convert Cartesian G-code to string-space G-code"""
        output = []
        current_x, current_y = 0, 0

        for line in input_gcode.split('\n'):
            if line.startswith('G1') or line.startswith('G0'):
                # Parse X Y coordinates
                # Transform to strings
                # Output as G1 X{L1} Y{L2}
                pass

        return '\n'.join(output)
```

### SVG to String-Space G-code
```python
from svg.path import parse_path
from scribit_kinematics import ScribitKinematics

# Get anchor positions from calibration
kin = ScribitKinematics(
    anchor_left=(0, 100),    # Need actual values
    anchor_right=(200, 100)  # Need actual values
)

# Parse SVG
path = parse_path(svg_path_data)

# Generate G-code in string-space
for segment in path:
    x, y = segment.end.real, segment.end.imag
    L1, L2 = kin.cartesian_to_strings(x, y)
    print(f"G1 X{L1} Y{L2} F1000")
```

## Critical Questions to Answer

### 1. Where are the anchor positions?
**Need:**
- Left anchor: (x1, y1)
- Right anchor: (x2, y2)

**Sources:**
- Physical measurement
- Calibration API response parsing
- Reverse engineer from autocal.gcode

### 2. What does calibration API actually return?
We know it returns G92 + G1 commands, but:
- Does it encode anchor positions?
- Can we extract geometry data?
- Check actual API response

### 3. How did original app do conversion?
**Investigate:**
- Scribit mobile app (if available)
- Cloud API endpoints
- Any existing conversion tools

## Recommended Path Forward

### Phase 1: Get Anchor Positions
1. Run calibration on device
2. Capture API response
3. Analyze G92/G1 values
4. Try to extract anchor positions

### Phase 2: Build External Converter
1. Implement Python kinematics library
2. Test with simple shapes
3. Verify against known working G-code
4. Build SVG → string-space converter

### Phase 3: (Optional) Firmware Implementation
Once external converter works:
1. Port kinematics to C++
2. Implement scribit_mechanics class
3. Enable true Cartesian G-code support

## Rollback CoreXY

Since CoreXY doesn't work, revert firmware:

```bash
# Edit Configuration_Overall.h:
#define MECHANISM MECH_CARTESIAN
//#define MECHANISM MECH_COREXY
// Remove: #define CORE_FACTOR 1

# Rebuild
docker-compose -f docker/docker-compose.yml run --rm scribit-firmware \
  arduino-cli compile --fqbn briki:mbc-wb:mbc:mcu=samd \
  --output-dir /workspace/builds \
  /workspace/source/Firmware/MK4duo/MK4duo.ino

# Reflash original firmware
```

## Key Insight

**The firmware was NEVER designed to handle Cartesian coordinates.**

It's a **string-length controller**, not a Cartesian plotter. All Cartesian → string conversion happened in the cloud/app **before** G-code reached the device.

To use standard Cartesian G-code, we must either:
1. **Preprocess externally** (easier, original approach)
2. **Implement firmware kinematics** (harder, more elegant)

Both require knowing the anchor positions.
