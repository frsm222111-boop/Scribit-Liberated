# ✅ CALIBRATED PEN POSITIONS - FINAL SIMPLE METHOD

## Pen Positions (Absolute - ALL 4 PENS WORKING!)

| Pen | Color | Absolute Z | Formula |
|-----|-------|------------|---------|
| 1   | Black | **89**     | 89 + (0×72) |
| 2   | Red   | **161**    | 89 + (1×72) |
| 3   | Blue  | **233**    | 89 + (2×72) |
| 4   | Green | **305**    | 89 + (3×72) |

## Formula

```python
absolute_z = 89 + (pen_number - 1) × 72
```

Where `pen_number` is 1-4.

## Complete Working Example

**File:** `gcode/test-pens-absolute.gcode`

```gcode
M17
G77

; Pen 1
G90
G1 Z89
G101

G91
G1 Z72
G1 Z-72

; Pen 2
G90
G1 Z161
G101

G91
G1 Z72
G1 Z-72

; Pen 3
G90
G1 Z233
G101

G91
G1 Z72
G1 Z-72

; Pen 4
G90
G1 Z305
G101

G91
G1 Z72
G1 Z-72

M18
```

## Why These Values?

- **89** is the absolute position for pen 1
- **72** is the spacing between each pen position
- **G101** corrects overshoot after selecting pen
- **G1 Z72** followed by **G1 Z-72** creates forward-back motion that extends pen to wall
- All 4 pens verified working with this method!

## Pen Control Summary

```gcode
; Select pen (absolute mode)
G90           ; Absolute mode
G1 Z89        ; Pen 1 (or 161/233/305 for pens 2/3/4)
G101          ; Correct overshoot

; Switch to relative mode
G91           ; Relative mode

; Pen down (forward-back motion)
G1 Z72        ; Move forward
G1 Z-72       ; Move back = PEN DOWN!

; ... drawing commands ...

; Pen up (from -72 position)
G1 Z72        ; Move forward = PEN UP!
```

## Files Updated

✅ `tools/scribit_svg_to_gcode.py` - Updated to use 89/161/233/305 with Z72/-72 motion
✅ `docs/PEN_CONTROL_FINAL_SIMPLE.md` - Complete documentation
✅ `gcode/test-pens-absolute.gcode` - User-created test file (verified on hardware)
✅ `gcode/star_final_simple.gcode` - SVG converter output with final method
✅ `gcode/multicolor_final_simple.gcode` - Multi-color test with pen switching

## Verification

Run `gcode/test-pens-absolute.gcode` to verify each pen:
1. Cylinder homes with G77 (ONCE at start)
2. Each pen rotates to correct position (G90, Z position, G101)
3. Forward-back motion (Z72, Z-72) extends pen to wall
4. All 4 pens work correctly!

This is the definitive, working method! ✅
