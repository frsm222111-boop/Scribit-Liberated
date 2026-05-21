# Scribit Hardware Geometry Analysis

## Physical Description

### Main Cylinder
- **Diameter:** 6 inches (152.4 mm)
- **Radius:** 3 inches (76.2 mm)
- **Purpose:** Houses motors and pen assembly

### String Motors & Spools
- **Location:** Directly on **sides** of main cylinder (left and right edges)
- **Spool alignment:** Top of spool flush with top of cylinder
- **String exit:** From top of each motor/spool

### Wall Anchors
- **Spacing:** 2.25 meters (2250 mm) apart - **VARIABLE per installation**
- **Type:** Fixed pins on wall where strings attach

### Pen Assembly (Inner Cylinder)
- **Location:** Center of main cylinder
- **Type:** Smaller rotating cylinder with 4 pen holders
- **Pen pattern:** 4 pens at 4 points of imaginary pentagon = **72° spacing**
  - Pentagon has 5 points at 72° each
  - Using 4 of those 5 points
- **Pen opening:** Faces the wall
- **Pen opening position:** **1 inch above** cylinder center

### Bottom Assembly
- **Spiral cable:** Provides weight and stability, holds assembly against wall

## Diagrams

### Front View (Looking at Wall) - TRIANGLE CONFIGURATION

```
                        WALL
         [Anchor A]              [Anchor B]
              •                       •      ← Anchors at TOP of wall
              │╲                   ╱│
              │  ╲               ╱  │
              │    ╲  String 1 ╱    │
              │      ╲       ╱      │
              │        ╲   ╱        │
              │          ╳          │        String 2
              │        ╱   ╲        │
              │      ╱       ╲      │
              │    ╱           ╲    │
              │  ╱               ╲  │
              │╱                   ╲│
              ┌─────────────────────┐
              │  [M]         [M]    │       [M] = Motors at edges
              │                     │       Device HANGS from strings
              │      ┌─────┐        │
              │      │  P→ │        │       P = Pen (faces wall)
              │      └─────┘        │       1" above center
              │                     │
              └──────────┬──────────┘
                         │
                    Spiral Cable
                         ↓
                    (adds weight)

              ├──── 2.25m (2250mm) ────┤
```

### Top View (Bird's Eye)

```
                        WALL
         [Anchor A]              [Anchor B]
              •                       •      ← Anchors on wall

         String 1 ╲               ╱ String 2
                   ╲             ╱
                    ╲           ╱
                     ╲         ╱
                      ╲       ╱
              ┌────────●─────●────────┐
              │       [M]   [M]       │    [M] = Motors (string spools)
              │                       │    Device hangs here
              │      ┌─────┐          │
              │      │  P→ │          │    Inner rotating cylinder
              │      │ ╱│╲ │          │    P = Pen faces wall
              │      └─────┘          │
              │                       │
              └───────────────────────┘
                   ← 6" diameter →
```

### Side View (From Wall Looking Out)

```
    WALL
     ║
     ║   String comes from anchor above (not shown)
     ║         ↓
     ║   ┌─────────────┐
     ║   │[M]       [M]│       [M] = Motors with spools
     ║   │             │       String wraps on spools
     ║   │             │
     ║   │  ┌─────┐    │
     ║   │  │[P]→ │    │       P = Pen (touches wall)
     ║   │  │  ↑  │    │       1" above cylinder center
     ║   │  │  │  │    │
     ║   │  └──┼──┘    │       ← Center reference line
     ║   │     │       │
     ║   └─────┼───────┘
     ║         │
     ║    Spiral Cable
     ║         ↓
     ║    (provides weight/stability)
```

### Pen Cylinder Detail (Top View)

```
           Pentagon pattern (5 points at 72° each)
           Using 4 of 5 points for pen holders

              ╱ Point 1 (unused)
             ●
            ╱ ╲
          ●     ●  ← Pen holders at 4 points
         ╱       ╲
        ●─────────●

    Rotation angles (from G101.h):
    - Pen 0: Z=89°
    - Pen 1: Z=161° (89 + 72)
    - Pen 2: Z=233° (161 + 72)
    - Pen 3: Z=305° (233 + 72)
```

## Critical Geometry for Kinematics

### Key Insight 1: Device HANGS from strings (suspended)

**Critical understanding:**
- Anchors are at **TOP** of wall (typically near ceiling)
- Strings hang **DOWN** to the device
- Device is suspended in mid-air, touching wall with pen
- Gravity pulls device down via spiral cable weight
- Motors reel strings in/out to move up/down/left/right

### Key Insight 2: Motors are at EDGES, not center

**This is crucial for the math:**
- The strings don't attach at the cylinder center
- String exit points are **76.2mm (3 inches) apart** from center
- Left motor: `-76.2mm` from center
- Right motor: `+76.2mm` from center
- **Total spacing between string points: 152.4mm (6 inches)**

### Pen Position vs Cylinder Center

**Another critical offset:**
- Pen opening is **1 inch (25.4mm) ABOVE** cylinder center
- When pen draws at position Y, cylinder center is at Y + 25.4mm
- Must account for this in calculations

### Coordinate System

Wall coordinates (looking at wall):
- **Origin:** Likely top-left corner (near left anchor)
- **X-axis:** Horizontal (left to right)
- **Y-axis:** Vertical (top to bottom, **positive = down**)
- **Units:** Millimeters

**Anchor positions (at TOP of wall):**
- Left anchor: `(x1, y1)` - typically `(0, 0)` or small offset from corner
- Right anchor: `(x2, y2)` where `x2 = x1 + 2250mm`, `y2 = y1` (same height)

**Important:** Since device hangs DOWN, increasing Y-coordinate moves device down the wall.

## Kinematics Math

### Forward Transform: Pen Position → String Lengths

**Goal:** Convert desired pen tip position `(px, py)` to string lengths `(L1, L2)`

**Step 1:** Calculate cylinder center (pen is ABOVE center, toward wall)
```
cylinder_x = px
cylinder_y = py + 25.4mm    // Cylinder center 1" BELOW pen tip
                            // (pen extends UP from center toward wall)
```

**Step 2:** Calculate string attachment points (motors at edges)
```
left_motor_x = cylinder_x - 76.2mm   // Left motor at left edge
left_motor_y = cylinder_y            // Same height as cylinder center

right_motor_x = cylinder_x + 76.2mm  // Right motor at right edge
right_motor_y = cylinder_y           // Same height as cylinder center
```

**Step 3:** Calculate string lengths from anchors (at TOP) to motors (on device)
```
// String hangs DOWN from anchor to motor
L1 = sqrt((x1 - left_motor_x)² + (y1 - left_motor_y)²)
L2 = sqrt((x2 - right_motor_x)² + (y2 - right_motor_y)²)
```

**Output:** `G1 X{L1} Y{L2}` for firmware

**Note:** Since anchors are at TOP (y1, y2 small) and device hangs below (py large),
string lengths INCREASE as device moves down the wall (increasing Y).

### Why This is Nonlinear

The ratio `L1/L2` changes continuously based on pen position:
- When pen far left: L1 large, L2 small
- When pen center: L1 ≈ L2
- When pen far right: L1 small, L2 large

**Cannot be expressed as:** `Motor_A = X + constant*Y` (CoreXY style)

**Must use:** `L1 = sqrt(...)` with position-dependent terms

## Required Measurements

To implement the converter, we need:

### 1. Anchor Positions
- **Left anchor:** `(x1, y1)` in wall coordinates
- **Right anchor:** `(x2, y2)` in wall coordinates
- **Horizontal spacing:** 2250mm (known)
- **Vertical position:** Both at same height? (assume yes)

### 2. Coordinate Origin
- Where is `(0, 0)` on the wall?
- Top-left corner? Center? After G92?

### 3. Known Constants (from hardware)
- ✅ Cylinder diameter: 152.4mm (6 inches)
- ✅ Motor offset from center: ±76.2mm
- ✅ Pen offset from center: -25.4mm (above)
- ✅ Anchor spacing: 2250mm

## How to Find Anchor Positions

### Method 1: Physical Measurement
1. Measure wall dimensions
2. Measure anchor pin locations from wall corners
3. Define coordinate origin (e.g., top-left)
4. Record `(x1, y1)` and `(x2, y2)`

### Method 2: From Calibration
1. Run device calibration (autocal.gcode)
2. Note starting position after G92 command
3. Device knows it's at a specific string length combination
4. Reverse calculate anchors from known geometry

### Method 3: From Working G-code
1. Find G-code that drew successfully
2. Pick known positions (e.g., corners of drawing)
3. Measure actual drawn positions on wall
4. Reverse calculate anchor positions

## Next Steps

1. **Measure/determine anchor positions** - this is the blocker
2. **Implement Python kinematics library** with proper offsets
3. **Test with simple shapes** - verify math is correct
4. **Build SVG → string-space converter**

## Questions to Answer

1. **Exact anchor positions?**
   - Can you measure them on your wall?
   - Or run calibration and capture the G92/G1 commands?

2. **Coordinate origin?**
   - Where is (0,0)?
   - After G92, is that (0,0) or some other point?

3. **String exit height?**
   - Anchors are at what height from floor?
   - Does this affect calculations?

4. **Working area?**
   - Given 2.25m anchor spacing, what's max drawable area?
   - What are the string length limits?

## Summary of Offsets

| What | Value | Direction |
|------|-------|-----------|
| Motor separation | 152.4mm | Horizontal (edge to edge) |
| Left motor from center | -76.2mm | Left |
| Right motor from center | +76.2mm | Right |
| Pen from center | -25.4mm | Upward (toward wall) |
| Anchor spacing | 2250mm | Horizontal |

These offsets are **critical** - ignoring them will cause incorrect positioning!
