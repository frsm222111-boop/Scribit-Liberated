# Scribit Geometry Reference

## Coordinate System

```
         A (Left Anchor)              B (Right Anchor)
         •─────────────────────────────•
         │                             │
         │  ← anchor_distance (2250mm) →
         │                             │
      L1 │                             │ L2
         │        M (projection)       │
         │        ↓                    │
         │        •                    │
         │        │ H (height)         │
         │        ↓                    │
         │        C (Scribit)          │
         │        •                    │
         ↓                             ↓
```

## Right Triangle Geometry

The system forms two right triangles:
- **Triangle AMC:** Left anchor (A), projection point (M), scribit (C)
- **Triangle BMC:** Right anchor (B), projection point (M), scribit (C)

### Key Measurements

- **A:** Left anchor at (0, 0)
- **B:** Right anchor at (2250, 0)
- **C:** Scribit position
- **M:** Point on line AB, perpendicular to C
- **L1:** Left string length (AC)
- **L2:** Right string length (BC)
- **AM:** Horizontal distance from left anchor to M
- **BM:** Horizontal distance from right anchor to M
- **H:** Height (vertical distance CM, constant for horizontal movement)

### Relationships

```
AM + BM = anchor_distance (2250mm)

L1² = AM² + H²    (Pythagorean theorem)
L2² = BM² + H²

AM = (L1² - L2² + anchor_distance²) / (2 × anchor_distance)
BM = anchor_distance - AM
H = √(L1² - AM²)
```

## Horizontal Movement at Constant Height

To move horizontally by distance Δ while maintaining constant height H:

### Step 1: Calculate Current Position
```python
AM = (L1² - L2² + anchor_distance²) / (2 × anchor_distance)
BM = anchor_distance - AM
H = √(L1² - AM²)
```

### Step 2: Calculate New Position
```python
AM_new = AM + Δ      # Move right (positive Δ)
BM_new = BM - Δ      # Move left (negative Δ)
```

### Step 3: Calculate New String Lengths
```python
L1_new = √(AM_new² + H²)
L2_new = √(BM_new² + H²)
```

### Step 4: Calculate Deltas
```python
delta_L1 = L1_new - L1
delta_L2 = L2_new - L2
```

### Step 5: Generate G-code (G91)
```python
# CRITICAL: Negate right string delta!
gcode = f"G1 X{delta_L1:.3f} Y{-delta_L2:.3f}"
```

## Example Calculation

Given:
- Anchor distance: 2250mm
- L1 (left string): 1930mm
- L2 (right string): 1982mm
- Move right: 100mm

### Current Position
```
AM = (1930² - 1982² + 2250²) / (2 × 2250) = 1079.79mm
BM = 2250 - 1079.79 = 1170.21mm
H = √(1930² - 1079.79²) = 1599.67mm
```

### After Moving Right 100mm
```
AM_new = 1079.79 + 100 = 1179.79mm
BM_new = 1170.21 - 100 = 1070.21mm

L1_new = √(1179.79² + 1599.67²) = 1987.68mm
L2_new = √(1070.21² + 1599.67²) = 1924.65mm

delta_L1 = 1987.68 - 1930 = +57.68mm
delta_L2 = 1924.65 - 1982 = -57.35mm
```

### G-code Output
```gcode
G1 X57.680 Y57.350
         ^^^^^ Right delta negated: -(-57.35) = 57.35
```

## Vertical Movement

For pure vertical movement (toward/away from anchors), maintain constant AM and BM while changing H.

**Note:** This is more complex as it requires equal changes to both strings, causing both to lengthen or shorten together.

## Movement Characteristics

### Horizontal Movement
- One string lengthens, one shortens
- Changes are approximately equal magnitude, opposite sign
- Height H remains constant
- M point moves along line AB

### Vertical Movement
- Both strings change in same direction
- Changes are approximately equal magnitude and sign
- AM and BM remain constant
- H changes

### Diagonal Movement
- Both strings change with different magnitudes
- Both position (AM, BM) and height (H) change

## Breaking Into Steps

For straighter paths, break long movements into small steps (10-20mm each):

```python
steps = 10
step_distance = total_distance / steps

for i in range(steps):
    # Calculate new position for this step
    # Generate G-code command
    # Update current position
```

This minimizes cumulative errors and provides smoother motion.

## Coordinate System Note

The firmware's G91 mode has a non-standard coordinate mapping. See `g91-coordinate-mapping.md` for details on the Y-axis negation requirement.
