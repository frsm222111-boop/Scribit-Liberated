# Anchor Positions - CONFIRMED

## Given Information

### Anchor Configuration:
- **Horizontal spacing:** 2.25 meters (2250mm) - exact
- **Vertical alignment:** Both anchors at same height (level)
- **Wall edges:** No padding - anchors at extreme left and right edges

## Coordinate System Definition

Using **top-left corner of wall as origin (0, 0)**:

### Anchor Positions:
```
Left Anchor (A):   (0, 0)      - At top-left corner
Right Anchor (B):  (2250, 0)   - At top-right corner, 2.25m across
```

### Visual:
```
(0,0)                                    (2250,0)
  •─────────────────────────────────────•
  [Anchor A]                    [Anchor B]
  │╲                                 ╱│
  │  ╲                             ╱  │
  │    ╲  String 1           ╱      │
  │      ╲                 ╱        │
  │        ╲   [Device] ╱          │
  │          ╲       ╱              │
  │            ╲   ╱                │
  │              ╳                  │
  │            ╱   ╲                │
  │          ╱       ╲              │
  │        ╱    Pen    ╲            │
  │      ╱     at (px,py) ╲         │
  │    ╱                   ╲        │
  │  ╱                       ╲      │
  │╱                           ╲    │
  +Y (down)

  Wall width: 2250mm (2.25m)
```

## Kinematics Formulas (FINAL)

### Known Constants:
```python
# Anchor positions (confirmed)
anchor_left_x = 0       # mm
anchor_left_y = 0       # mm
anchor_right_x = 2250   # mm
anchor_right_y = 0      # mm

# Hardware constants
motor_offset = 76.2     # mm (3 inches, half of 6" cylinder)
pen_offset = 25.4       # mm (1 inch above cylinder center)
```

### Forward Transform: Pen Position (px, py) → String Lengths (L1, L2)

```python
def cartesian_to_strings(px, py):
    """
    Convert Cartesian pen position to string lengths.

    Args:
        px: Pen X position (mm, 0 = left edge of wall)
        py: Pen Y position (mm, 0 = top edge of wall)

    Returns:
        L1: Left string length (mm)
        L2: Right string length (mm)
    """
    # Step 1: Account for pen being above cylinder center
    cylinder_y = py + pen_offset  # Cylinder 1" below pen
    cylinder_x = px

    # Step 2: Account for motors at cylinder edges
    left_motor_x = cylinder_x - motor_offset   # Left motor
    left_motor_y = cylinder_y

    right_motor_x = cylinder_x + motor_offset  # Right motor
    right_motor_y = cylinder_y

    # Step 3: Calculate string lengths from anchors
    L1 = math.sqrt((anchor_left_x - left_motor_x)**2 +
                   (anchor_left_y - left_motor_y)**2)

    L2 = math.sqrt((anchor_right_x - right_motor_x)**2 +
                   (anchor_right_y - right_motor_y)**2)

    return L1, L2
```

### Simplified (substituting anchor values):

```python
def cartesian_to_strings(px, py):
    """Simplified with known anchor positions"""
    # Cylinder center (pen extends up 1" toward wall)
    cy = py + 25.4
    cx = px

    # Motor positions (at edges of 6" cylinder)
    left_x = cx - 76.2
    right_x = cx + 76.2

    # String lengths from anchors at (0,0) and (2250,0)
    L1 = math.sqrt(left_x**2 + cy**2)              # From (0,0)
    L2 = math.sqrt((2250 - right_x)**2 + cy**2)    # From (2250,0)

    return L1, L2
```

## Example Calculations

### Example 1: Center of wall, 500mm down

```
Pen position: (1125, 500)  # Center X, 500mm from top

Cylinder center:
  cx = 1125
  cy = 500 + 25.4 = 525.4

Motor positions:
  Left motor:  (1125 - 76.2, 525.4) = (1048.8, 525.4)
  Right motor: (1125 + 76.2, 525.4) = (1201.2, 525.4)

String lengths:
  L1 = sqrt(1048.8² + 525.4²) = sqrt(1,099,980.8 + 276,045.2)
     = sqrt(1,376,026) = 1172.9 mm

  L2 = sqrt((2250 - 1201.2)² + 525.4²)
     = sqrt(1048.8² + 525.4²) = 1172.9 mm

Result: Both strings equal length (symmetric position) ✓
```

### Example 2: Far left, 1000mm down

```
Pen position: (300, 1000)  # Near left edge

Cylinder center:
  cx = 300
  cy = 1025.4

Motor positions:
  Left motor:  (223.8, 1025.4)
  Right motor: (376.2, 1025.4)

String lengths:
  L1 = sqrt(223.8² + 1025.4²) = sqrt(50,086 + 1,051,445)
     = sqrt(1,101,531) = 1049.5 mm

  L2 = sqrt((2250 - 376.2)² + 1025.4²)
     = sqrt(1873.8² + 1025.4²) = sqrt(3,511,125 + 1,051,445)
     = sqrt(4,562,570) = 2136.0 mm

Result: Left string shorter, right string longer ✓
```

## Workspace Limits

### Drawable Area

With anchors at edges (0, 0) and (2250, 0):

**Horizontal limits:**
- Minimum X: ~150mm (avoid extreme angles)
- Maximum X: ~2100mm (avoid extreme angles)
- **Usable width: ~1950mm**

**Vertical limits:**
- Minimum Y: ~200mm (avoid top dead zone)
- Maximum Y: Depends on string length limits
  - If max string = 3000mm: can go ~2500mm down
- **Usable height: ~2300mm** (typical)

**Recommended safe drawing area:**
```
X: 200mm to 2050mm  (1850mm wide)
Y: 300mm to 2200mm  (1900mm tall)
```

### String Length Limits

Need to check firmware for:
- `X_MIN_POS` / `X_MAX_POS` - left string limits
- `Y_MIN_POS` / `Y_MAX_POS` - right string limits

From `Configuration_Overall.h`:
```cpp
// Check these values:
#define X_MIN_POS 0
#define X_MAX_POS 3000  // Max left string length
#define Y_MIN_POS 0
#define Y_MAX_POS 3000  // Max right string length
```

## G-code Output Format

For pen at position (px, py):

```python
L1, L2 = cartesian_to_strings(px, py)
gcode = f"G1 X{L1:.2f} Y{L2:.2f} F1000"
```

Example:
```
Pen at (1125, 500) → G1 X1172.90 Y1172.90 F1000
```

## Ready to Implement!

All parameters confirmed. Next step:
1. Create Python kinematics library
2. Test with simple shapes
3. Build SVG → string-space converter
