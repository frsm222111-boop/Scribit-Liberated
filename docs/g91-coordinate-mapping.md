# G91 Coordinate Mapping - CRITICAL

## Summary
The Scribit firmware uses a **non-intuitive coordinate mapping** in G91 (relative) mode. X and Y parameters do NOT directly map to left and right string deltas.

## Discovered Mapping

**CRITICAL: Right string delta must be NEGATED**

```
G-code: G1 X{left_delta} Y{-right_delta}
                          ^^^^^^^^^^^^^ NOTE: Negated!
```

### Formula
```python
# Calculate physical string length changes
delta_left = new_left_length - current_left_length
delta_right = new_right_length - current_right_length

# Generate G-code with negated right delta
gcode = f"G1 X{delta_left} Y{-delta_right}"
```

## Experimental Verification

Tested movements in G91 mode:

| G-code Command | Left String | Right String | Observed Movement |
|---------------|-------------|--------------|-------------------|
| `G1 X50 Y50`  | +50mm       | -50mm (!)    | Right + Up        |
| `G1 X50 Y-50` | +50mm       | +50mm (!)    | Down              |
| `G1 X-50 Y50` | -50mm       | -50mm (!)    | Up                |
| `G1 X-50 Y-50`| -50mm       | +50mm (!)    | Left + Down       |
| `G1 X0 Y50`   | 0mm         | -50mm (!)    | Up + Left         |

## Key Insight

The firmware applies this transformation:
```
actual_left_delta = X
actual_right_delta = -Y  (negated!)
```

## Why This Matters

### ❌ Wrong (Direct Mapping)
```python
# This will cause incorrect movement!
gcode = f"G1 X{delta_left} Y{delta_right}"
```

### ✅ Correct (Negated Right)
```python
# This produces correct movement
gcode = f"G1 X{delta_left} Y{-delta_right}"
```

## Horizontal Movement Example

To move horizontally right by 100mm at constant height:

### Physics Calculation
```python
# Using right triangle geometry
# M = point above scribit on anchor line
# H = constant height (perpendicular distance)

AM = (L1² - L2² + anchor_dist²) / (2 × anchor_dist)
H = √(L1² - AM²)

# Move M right by 100mm
AM_new = AM + 100
BM_new = BM - 100

# New string lengths
L1_new = √(H² + AM_new²)
L2_new = √(H² + BM_new²)

delta_left = L1_new - L1    # e.g., +57mm
delta_right = L2_new - L2   # e.g., -58mm
```

### G-code Generation
```python
# MUST negate right delta!
gcode = f"G1 X{delta_left:.3f} Y{-delta_right:.3f}"
# Result: G1 X57.000 Y58.000  (right was -58, negated to +58)
```

## G90 vs G91

### G90 (Absolute Mode)
- Uses **Cartesian coordinates** (x, y position on wall)
- Firmware does inverse kinematics internally
- More predictable but requires knowing current position

### G91 (Relative Mode)
- Uses **string length deltas** with negation quirk
- X = left string delta
- Y = **negative** right string delta
- Less predictable, coordinate system transformation applied

## Recommendation

**For horizontal/vertical movements:**
1. Calculate string deltas using geometry
2. Apply negation: `Y = -delta_right`
3. Use small steps (10-20mm) for straighter paths
4. Verify with test movements

## Implementation

See `tools/scribit_horizontal_straight.py` for reference implementation.

Key line:
```python
gcode_lines.append(f"G1 X{delta_L:.3f} Y{-delta_R:.3f}")
#                                        ^ Negation here!
```

## Date Discovered
2025-01-07

## Impact
- All previous G91 movement scripts were incorrect
- Explains why movements were diagonal/vertical instead of horizontal
- Critical for any future G91-based movement generation
