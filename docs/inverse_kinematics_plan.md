# Inverse Kinematics Plan for Scribit

## Problem Statement
Current firmware configuration treats X/Y G-code commands as direct string motor control, not Cartesian coordinates. This makes standard SVG-to-G-code conversion unusable.

**Evidence:**
- Test `test-cartesian-rect-move.gcode`: X command moved only left motor, Y only right motor
- No coordinate transformation in cartesian_mechanics.cpp
- Firmware uses `MECH_CARTESIAN` which has no transform function

## Key Findings from Source Code Analysis

### Current Configuration
- **File:** `Firmware/MK4duo/Configuration_Overall.h:57`
- **Setting:** `#define MECHANISM MECH_CARTESIAN`
- **Problem:** No coordinate transformation - X/Y map directly to motor steps

### CoreXY Transform Available
- **File:** `Firmware/MK4duo/src/core/planner/planner.cpp:1503-1504`
- **Code:**
  ```cpp
  #if CORE_IS_XY
    long da = dx + CORE_FACTOR * dy;  // Motor A = X + Y
    long db = dx - CORE_FACTOR * dy;  // Motor B = X - Y
  #endif
  ```
- **Status:** Available but not enabled
- **Location:** Configuration_Overall.h:58 (commented out)

### How CoreXY Works
**Forward Transform (Cartesian → Motors):**
```
Motor A steps = (X + Y) * steps_per_mm
Motor B steps = (X - Y) * steps_per_mm
```

**Inverse Transform (Motors → Cartesian):**
```
X = (Motor A + Motor B) / 2
Y = (Motor A - Motor B) / 2
```

**Implementation:** planner.cpp:1323-1337

### Comparison with Delta Mechanics
Delta printers have similar dual-motor kinematics:
- **Transform function:** delta_mechanics.cpp:123 `Transform(raw[XYZ])`
- **Inverse transform:** delta_mechanics.h:121 `InverseTransform(Ha, Hb, Hc, cartesian[XYZ])`
- **Called during:** Motion planning, position sync

## Solution Options

### Option 1: Enable CoreXY Mode ⭐ RECOMMENDED
**Simplest approach - use existing firmware capability**

#### Steps:
1. **Modify Configuration_Overall.h:**
   ```cpp
   //#define MECHANISM MECH_CARTESIAN  // Comment out line 57
   #define MECHANISM MECH_COREXY      // Uncomment line 58
   ```

2. **Verify CORE_FACTOR:**
   - Already set to 1 in Configuration_Core.h:94
   - Standard CoreXY value
   - May need tuning based on geometry

3. **Rebuild and test:**
   - Compile firmware
   - Test with simple shapes (squares, circles)
   - Verify Cartesian commands work correctly

#### Advantages:
- No code changes needed
- Already tested in MK4duo firmware
- Handles transform in planner automatically
- Supports both forward/inverse kinematics

#### Potential Issues:
- CoreXY assumes perpendicular motors
- Scribit has triangular (V-shaped) anchor points
- May need geometry adjustment

### Option 2: Implement Custom Scribit Kinematics
**If CoreXY insufficient, create Scribit-specific transform**

#### Architecture:
```
scribit_mechanics.h/cpp
├── Transform(X, Y, Z) → (L1, L2, Z)
│   L1 = sqrt((X - x1)² + (Y - y1)²)
│   L2 = sqrt((X - x2)² + (Y - y2)²)
│
└── InverseTransform(L1, L2, Z) → (X, Y, Z)
    Solve 2-circle intersection
```

#### Required Data:
- Anchor A position: (x1, y1) - left motor
- Anchor B position: (x2, y2) - right motor
- Source: Calibration API or measurements

#### Implementation Steps:
1. Add `MECH_SCRIBIT` to macros.h
2. Create scribit_mechanics.h/cpp (model after delta_mechanics)
3. Implement Transform/InverseTransform functions
4. Integrate into planner.cpp (like line 2602)
5. Update mechanics.h includes

### Option 3: External G-code Preprocessing
**Fallback if firmware changes impractical**

#### Components:
1. **Python kinematics library:**
   ```python
   def cartesian_to_strings(x, y, anchor_a, anchor_b):
       l1 = math.sqrt((x - anchor_a[0])**2 + (y - anchor_a[1])**2)
       l2 = math.sqrt((x - anchor_b[0])**2 + (y - anchor_b[1])**2)
       return l1, l2
   ```

2. **G-code converter:**
   - Parse input G-code
   - Transform X/Y coordinates
   - Output modified G-code

3. **Integration:**
   - Web UI preprocessing
   - Or standalone tool

## Recommended Implementation Path

### Phase 1: Test CoreXY (Option 1)
1. Enable MECH_COREXY configuration
2. Rebuild firmware
3. Test with standard shapes:
   - Horizontal line: `G1 X50 Y0`
   - Vertical line: `G1 X0 Y50`
   - Square: `G1 X50 Y0, X50 Y50, X0 Y50, X0 Y0`
   - Circle: G2/G3 arc commands
4. Measure accuracy

### Phase 2: Analyze Geometry
If CoreXY incorrect:
1. Extract anchor positions from:
   - Physical measurements
   - Calibration API response
   - Reverse engineer from working G-code
2. Calculate actual transform equations
3. Determine if matches CoreXY or needs custom

### Phase 3: Implement Custom (if needed)
If CoreXY insufficient:
1. Implement scribit_mechanics class
2. Add proper string-length kinematics
3. Test and validate

## Critical Questions to Answer

### Geometry Questions:
1. **Q:** What are anchor motor positions (x1,y1), (x2,y2)?
   **A:** Need from calibration or measurement

2. **Q:** Does CoreXY math match Scribit geometry?
   **A:** Test will determine

3. **Q:** Is CORE_FACTOR=1 correct?
   **A:** Test and tune if needed

### Calibration Questions:
4. **Q:** Does calibration API return geometry data?
   **A:** Check docs/calibration-cloud-api-analysis.md - appears to only return G92/G1 commands

5. **Q:** Can we derive geometry from calibration response?
   **A:** May need to reverse engineer

### Technical Questions:
6. **Q:** Does firmware handle string length limits?
   **A:** Check if position_is_reachable() works with CoreXY

7. **Q:** Are there workspace boundary checks?
   **A:** Need to verify XYZE limits apply correctly

## Files to Modify

### Option 1 (CoreXY):
- `Firmware/MK4duo/Configuration_Overall.h` - line 57-58

### Option 2 (Custom):
- `Firmware/MK4duo/src/lib/macros.h` - add MECH_SCRIBIT
- `Firmware/MK4duo/src/core/mechanics/scribit_mechanics.h` - new
- `Firmware/MK4duo/src/core/mechanics/scribit_mechanics.cpp` - new
- `Firmware/MK4duo/src/core/mechanics/mechanics.h` - add include
- `Firmware/MK4duo/src/core/planner/planner.cpp` - add transform call

## References

### Key Source Files:
- `Firmware/MK4duo/Configuration_Overall.h:57-58` - mechanism config
- `Firmware/MK4duo/src/core/planner/planner.cpp:1503-1504` - CoreXY transform
- `Firmware/MK4duo/src/core/planner/planner.cpp:1323-1337` - inverse transform
- `Firmware/MK4duo/src/core/mechanics/delta_mechanics.cpp` - example kinematics
- `Firmware/MK4duo/src/core/mechanics/cartesian_mechanics.cpp` - current (no transform)

### Documentation:
- `docs/coordinate-system-analysis.md` - test results showing direct motor control
- `docs/calibration-cloud-api-analysis.md` - calibration process
- `gcode/test-cartesian-rect-move.gcode` - failing test

## Next Steps
1. ✅ Document findings (this file)
2. ⏭️ Implement Option 1: Enable CoreXY mode
3. ⏭️ Build and flash firmware
4. ⏭️ Test with Cartesian G-code
5. ⏭️ Evaluate results and decide next steps
