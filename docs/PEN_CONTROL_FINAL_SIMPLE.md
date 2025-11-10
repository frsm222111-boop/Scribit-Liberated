# Scribit Pen Control - FINAL SIMPLE METHOD (VERIFIED)

## The Elegant Solution - ALL 4 PENS WORKING!

After hardware testing, the **simplest and most reliable** method has been discovered.

## Pen Down Sequence

### Step 1: Select Pen (Absolute Mode)
```gcode
G90          ; Absolute positioning
G1 Z89       ; Select pen 1 (or 161/233/305 for pens 2/3/4)
G101         ; Correct overshoot
```

### Step 2: Lower Pen (Relative Mode)
```gcode
G91          ; Relative positioning
G1 Z72       ; Move forward 72 units
G1 Z-72      ; Move back -72 units (PEN DOWN!)
```

**The magic:** `G1 Z72` followed immediately by `G1 Z-72` causes pen to extend and contact wall!

### Step 3: Pen Up
```gcode
G1 Z72       ; Move forward 72 units (PEN UP)
G1 Z-72      ; Return to position
```

Or simply move to the next pen position.

## Working Pen Positions

| Pen | Color | Absolute Z | Status |
|-----|-------|------------|--------|
| 1   | Black | 89         | ✅ Working |
| 2   | Red   | 161        | ✅ Working |
| 3   | Blue  | 233        | ✅ Working |
| 4   | Green | 305        | ✅ Working |

**All 4 pens now work!** The pen 4 issue was resolved with this method.

## Complete Working Example

**File:** `gcode/test-pens-absolute.gcode`

```gcode
M17
G77          ; Home cylinder (ONCE at start)

; Pen 1
G90
G1 Z89       ; Select pen 1
G101         ; Correct overshoot

G91
G1 Z72       ; Forward
G1 Z-72      ; Back = PEN DOWN

; Pen 2
G90
G1 Z161      ; Select pen 2
G101         ; Correct overshoot

G91
G1 Z72       ; Forward
G1 Z-72      ; Back = PEN DOWN

; Pen 3
G90
G1 Z233      ; Select pen 3
G101         ; Correct overshoot

G91
G1 Z72       ; Forward
G1 Z-72      ; Back = PEN DOWN

; Pen 4
G90
G1 Z305      ; Select pen 4
G101         ; Correct overshoot

G91
G1 Z72       ; Forward
G1 Z-72      ; Back = PEN DOWN

M18
```

## Drawing Template

```gcode
M17
G77          ; Home cylinder (ONCE!)

; Select and prepare pen 1
G90
G1 Z89
G101

G91
G1 F1000     ; Set feedrate

; Move to start position
G1 X50 Y-50

; Pen down
G1 Z72
G1 Z-72

; Draw
G1 X100 Y0
G1 X0 Y100
G1 X-100 Y0
G1 X0 Y-100

; Pen up (move forward 72)
G1 Z72

; Move to new position
G1 X150 Y-50

; Pen down again
G1 Z-72

; Draw more
G1 X50 Y50

; Final pen up
G1 Z72

M18
```

## Switching Pens During Drawing

```gcode
; Currently at pen 1, pen is down (at Z-72 relative)
G1 Z72       ; Pen up (back to Z0 relative)

; Switch to pen 2
G90
G1 Z161      ; Select pen 2
G101

G91

; Move to new position
G1 X100 Y-100

; Pen down
G1 Z72
G1 Z-72

; Draw with pen 2
G1 X50 Y50

; Pen up
G1 Z72
```

## Why This Works

1. **G77** homes the cylinder to a known zero position
2. **G90 + G1 Z[pen]** rotates cylinder to pen position (absolute)
3. **G101** makes a small correction for overshoot
4. **G91** switches to relative mode
5. **G1 Z72** moves the mechanism forward
6. **G1 Z-72** moves back, causing pen to extend and contact wall
7. **G1 Z72** (alone) retracts pen from wall

The forward-then-back motion (Z72, Z-72) creates the mechanical action needed for pen contact.

## Pen State Tracking

When drawing, track the relative Z position:
- **At pen selection:** Z position = 0 (relative)
- **After pen down:** Z position = -72 (relative)
- **After pen up:** Z position = 0 (relative)

## Critical Rules

1. ✅ Call **G77** ONCE at the start (homes cylinder)
2. ✅ Use **G90** for pen selection (absolute positioning)
3. ✅ Use **G101** immediately after selecting pen (corrects overshoot)
4. ✅ Use **G91** for all movements and pen up/down (relative)
5. ✅ **Pen down** = `G1 Z72` then `G1 Z-72`
6. ✅ **Pen up** = `G1 Z72` (from Z-72 position)
7. ✅ **All 4 pens work** with this method!

## Advantages of This Method

1. ✅ **Simple** - Easy to understand and implement
2. ✅ **Reliable** - All 4 pens work (pen 4 issue resolved!)
3. ✅ **Consistent** - Same pattern for all pens
4. ✅ **Elegant** - Uses natural mechanical motion
5. ✅ **G77 once** - No need to rehome during drawing

## Common Patterns

### Pattern 1: Draw with current pen
```gcode
G1 X50 Y-50  ; Move
G1 Z72       ; Pen down forward
G1 Z-72      ; Pen down back
G1 X100 Y0   ; Draw
G1 Z72       ; Pen up
```

### Pattern 2: Switch pens
```gcode
G1 Z72       ; Pen up (if down)
G90          ; Absolute
G1 Z161      ; New pen
G101         ; Correct
G91          ; Relative
```

### Pattern 3: Multiple strokes with same pen
```gcode
; First stroke
G1 Z72       ; Down forward
G1 Z-72      ; Down back
G1 X100 Y0   ; Draw
G1 Z72       ; Up

; Move
G1 X50 Y-50

; Second stroke
G1 Z-72      ; Down (already at Z0, so just back)
G1 X50 Y50   ; Draw
G1 Z72       ; Up
```

## Summary

**Pen Selection:**
```gcode
G90          ; Absolute
G1 Z[89/161/233/305]
G101         ; Correct overshoot
G91          ; Relative
```

**Pen Down:**
```gcode
G1 Z72       ; Forward
G1 Z-72      ; Back = contact!
```

**Pen Up:**
```gcode
G1 Z72       ; Forward = lift!
```

**This is the definitive, working method for all 4 pens!** ✅
