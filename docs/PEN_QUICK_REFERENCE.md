# Scribit Pen Control - Quick Reference

## Pen Ready Positions

**Formula:** Start at 172, add 72 for each pen

| Pen | Color | Ready Z | Calculation |
|-----|-------|---------|-------------|
| 1   | Black | 172     | 172 + (0×72) |
| 2   | Red   | 244     | 172 + (1×72) |
| 3   | Blue  | 316     | 172 + (2×72) |
| 4   | Green | 388     | 172 + (3×72) |

## Pen Control Commands

```gcode
M17         ; Enable steppers (once at start)
G77         ; Home cylinder (once at start)

G90         ; Absolute mode
G1 Z172     ; Select pen 1 at ready position

G91         ; Relative mode (stay in this for drawing)
G1 Z-100    ; PEN DOWN ⬇️
G1 Z100     ; PEN UP ⬆️
```

## Drawing Template

```gcode
M17
G77
G90
G1 Z172     ; Pen 1 ready
G91
G1 F1000    ; Set feedrate

; Move to position
G1 X50 Y-50

; Pen down and draw
G1 Z-100
G1 X100 Y0
G1 X0 Y100

; Pen up
G1 Z100

; Move to new position
G1 X50 Y-50

; Pen down and draw more
G1 Z-100
G1 X-100 Y-100

; Pen up and finish
G1 Z100
M18
```

## Rules

1. ✅ G77 at start (home cylinder)
2. ✅ Use ready positions: 172/244/316/388
3. ✅ G90 when selecting pen
4. ✅ G91 for all drawing and pen up/down
5. ✅ Pen down = `G1 Z-100` (NEGATIVE!)
6. ✅ Pen up = `G1 Z100` (positive)
7. ✅ Formula: 172 + (pen_number-1) × 72

## Don't Use

❌ `G101` - Not for drawing (calibration only)
❌ Base Z values (89/161/233/305) - Use calibrated ready positions
❌ Old ready positions (189/261/333/405) - Use corrected values
❌ Positive for pen down - Must be negative!
