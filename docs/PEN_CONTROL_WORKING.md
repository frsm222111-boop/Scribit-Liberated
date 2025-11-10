# Scribit Pen Control - VERIFIED WORKING METHOD

## The Correct Pen Down Sequence (TESTED & VERIFIED)

### Two-Stage Pen Down

The pen requires **TWO commands** to properly contact the wall:

```gcode
G101         ; First stage: Move to initial contact (~30 units)
G1 Z-100     ; Second stage: Full extension to press pen to wall
```

Using only one or the other causes overshooting or insufficient contact. Both are required!

## Working Pen Positions

| Pen | Color | Ready Z | Status |
|-----|-------|---------|--------|
| 1   | Black | 172     | ✅ Working |
| 2   | Red   | 244     | ✅ Working |
| 3   | Blue  | 316     | ✅ Working |
| 4   | Green | 388     | ⚠️ Issues (gets stuck) |

**Note:** Pen 4 has mechanical issues - use pens 1-3 for reliable operation.

## Complete Working Sequence

### For Each Pen (1-3):

```gcode
G90          ; Absolute mode
G1 Z172      ; Select pen 1 ready position (or 244/316 for pen 2/3)
G91          ; Relative mode
G101         ; First stage pen down
G1 Z-100     ; Second stage pen down (full contact)
G4 P2000     ; Wait (optional, for testing)
G1 Z100      ; Pen up
```

## Pen Up Sequence

```gcode
G1 Z100      ; Single command to retract pen
```

## Why Two Commands for Pen Down?

1. **G101** moves the pen holder by a calibrated amount (~30 units default)
   - Gets pen close to wall
   - Prevents overshooting

2. **G1 Z-100** provides additional extension
   - Ensures full contact with wall
   - Consistent pressure across different pens

3. **Together** they position the pen perfectly
   - G101 alone: Doesn't reach wall
   - G1 Z-100 alone: Overshoots
   - G101 + G1 Z-100: Perfect contact ✅

## Drawing Template

```gcode
M17
G77
G90
G1 Z172      ; Select pen 1
G91
G1 F1000     ; Set feedrate

; Move to start
G1 X50 Y-50

; Pen down (two-stage)
G101
G1 Z-100

; Draw
G1 X100 Y0
G1 X0 Y100
G1 X-100 Y0
G1 X0 Y-100

; Pen up
G1 Z100

; Move to new position
G1 X150 Y-50

; Pen down again
G101
G1 Z-100

; Draw more
G1 X50 Y50

; Pen up and finish
G1 Z100
M18
```

## Switching Pens During Drawing

```gcode
; Currently at pen 1
G1 Z100      ; Pen up

; Switch to pen 2
G90          ; Absolute mode
G1 Z244      ; Select pen 2
G91          ; Back to relative

; Draw with pen 2
G1 X50 Y-50  ; Move
G101         ; Pen down stage 1
G1 Z-100     ; Pen down stage 2
G1 X100 Y0   ; Draw
G1 Z100      ; Pen up
```

## Critical Rules

1. ✅ Always use **G90** when selecting pen position (172/244/316)
2. ✅ Always switch to **G91** after selecting pen
3. ✅ Always use **G101** followed by **G1 Z-100** for pen down
4. ✅ Use single **G1 Z100** for pen up
5. ✅ Call **G77** at initialization to home cylinder
6. ⚠️ Avoid pen 4 (Z388) - has mechanical issues

## Mode Switching Pattern

```gcode
; Select pen (absolute)
G90
G1 Z172

; Everything else (relative)
G91
G1 F1000
G1 X50 Y-50    ; Move
G101           ; Pen down part 1
G1 Z-100       ; Pen down part 2
G1 X100 Y0     ; Draw
G1 Z100        ; Pen up

; Switch pen (back to absolute)
G90
G1 Z244

; Continue (back to relative)
G91
G1 X50 Y-50
G101
G1 Z-100
```

## Tested & Verified

File: `gcode/test_all_pens_fixed.gcode`

Results:
- ✅ Pen 1 (Z172): Works perfectly
- ✅ Pen 2 (Z244): Works perfectly
- ✅ Pen 3 (Z316): Works perfectly
- ⚠️ Pen 4 (Z388): Gets stuck (mechanical issue, not software)

## Common Mistakes

❌ **WRONG:** Using only G101
```gcode
G101         ; Not enough - doesn't reach wall
```

❌ **WRONG:** Using only G1 Z-100
```gcode
G1 Z-100     ; Overshoots - too much movement
```

✅ **CORRECT:** Using both in sequence
```gcode
G101         ; Stage 1
G1 Z-100     ; Stage 2
```

---

❌ **WRONG:** Staying in G91 for pen selection
```gcode
G91
G1 Z244      ; Wrong mode
```

✅ **CORRECT:** Using G90 for pen selection
```gcode
G90
G1 Z244      ; Correct
G91          ; Then switch back
```

## Technical Explanation

### Why G101 First?

G101 uses a calibrated value (default 30 units, or set by G100) that:
- Accounts for pen length variations
- Positions pen holder at optimal distance
- Prevents mechanical stress from overshooting

### Why G1 Z-100 Second?

The additional -100 units:
- Provides final extension to wall contact
- Ensures consistent pressure
- Works from the position G101 established

### Why This Combination Works

Together, they create a controlled two-stage movement:
1. **Coarse positioning** (G101): Get close safely
2. **Fine positioning** (G1 Z-100): Make contact precisely

This is more reliable than a single large movement.

## Summary

**Pen Down:** `G101` then `G1 Z-100` (two commands required!)
**Pen Up:** `G1 Z100` (single command)
**Pen Select:** `G90`, `G1 Z[172/244/316]`, then `G91`
**Working Pens:** 1, 2, 3 (avoid pen 4)
