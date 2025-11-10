# ✅ FINAL WORKING PEN CONTROL SOLUTION

## Verified & Tested on Physical Hardware

### The Working Method (Tested on Pens 1-3)

**Pen Down requires TWO commands in sequence:**
```gcode
G101         ; Stage 1: Initial contact (~30 units)
G1 Z-100     ; Stage 2: Full extension to wall
```

**Pen Up requires ONE command:**
```gcode
G1 Z100      ; Single retraction
```

### Working Pen Positions

| Pen | Color | Ready Z | Status |
|-----|-------|---------|--------|
| 1   | Black | 172     | ✅ Verified working |
| 2   | Red   | 244     | ✅ Verified working |
| 3   | Blue  | 316     | ✅ Verified working |
| 4   | Green | 388     | ❌ Gets stuck - DO NOT USE |

### Complete Working Example

**Test File:** `gcode/test_all_pens_fixed.gcode`

```gcode
M17
G77

; Pen 1
G90
G1 Z172
G91
G101        ; Stage 1
G1 Z-100    ; Stage 2
G4 P2000
G1 Z100

; Pen 2
G90
G1 Z244
G91
G101
G1 Z-100
G4 P2000
G1 Z100

; Pen 3
G90
G1 Z316
G91
G101
G1 Z-100
G4 P2000
G1 Z100

; Return
G90
G1 Z172
M18
```

### Drawing Template

```gcode
M17
G77
G90
G1 Z172      ; Select pen 1
G91
G1 F1000     ; Set feedrate

; Move to start
G1 X50 Y-50

; Pen down (TWO-STAGE!)
G101
G1 Z-100

; Draw
G1 X100 Y0
G1 X0 Y100
G1 X-100 Y0
G1 X0 Y-100

; Pen up
G1 Z100

M18
```

## Updated Files

✅ **SVG Converter** (`tools/scribit_svg_to_gcode.py`)
- Uses two-stage pen down: G101 + G1 Z-100
- Uses correct ready positions: 172/244/316
- Limits to pens 1-3 (pen 4 disabled)
- Maps green colors to pen 3 (since pen 4 doesn't work)

✅ **Documentation** (`docs/PEN_CONTROL_WORKING.md`)
- Complete verified method
- Tested positions
- Two-stage pen down explanation

✅ **Working Test Files**
- `gcode/test_all_pens_fixed.gcode` - Tests pens 1-3
- `gcode/star_working.gcode` - SVG converter output

## Why Two-Stage Pen Down?

1. **G101 alone** - Doesn't reach wall (undershoots)
2. **G1 Z-100 alone** - Goes too far (overshoots)
3. **G101 + G1 Z-100** - Perfect contact! ✅

The combination works because:
- G101 moves by calibrated amount (~30 units)
- This positions pen close to wall safely
- G1 Z-100 provides final extension
- Together they achieve proper wall contact

## Critical Rules

1. ✅ Always use **G90** when selecting pen
2. ✅ Always switch to **G91** after selecting pen
3. ✅ **MUST use both** G101 and G1 Z-100 for pen down
4. ✅ Use single G1 Z100 for pen up
5. ✅ **DO NOT USE PEN 4** - mechanical issues
6. ✅ Call G77 at start to home cylinder

## SVG Converter Output

Example from `star_working.gcode`:
```gcode
M17
G77
G90
G1 Z172      ; Pen 1 ready
G91
G1 F1000
G1 X-21.788 Y21.788   ; Move to start
G101                   ; Pen down stage 1 ✅
G1 Z-100              ; Pen down stage 2 ✅
G1 X29.955 Y-1.689    ; Draw
...
G1 Z100               ; Pen up ✅
```

## Test Results

**Hardware tested on real Scribit device:**
- ✅ Pen 1 at Z172: Perfect contact, no overshoot
- ✅ Pen 2 at Z244: Perfect contact, no overshoot
- ✅ Pen 3 at Z316: Perfect contact, no overshoot
- ❌ Pen 4 at Z388: Gets stuck (mechanical failure)

## Cleaned Up Files

Removed all non-working test files:
- Old calibration attempts
- Incorrect pen positioning tests
- Files with wrong pen down sequences

Kept only verified working files:
- `test_all_pens_fixed.gcode` - Hardware verified
- `star_working.gcode` - SVG converter output
- Working examples from user: `test-pen-0.gcode`, `test-pen-1.gcode`

## Ready for Production

The SVG to G-code converter is now:
- ✅ Using verified pen control sequence
- ✅ Using tested pen positions
- ✅ Limited to working pens (1-3)
- ✅ Generating correct two-stage pen down
- ✅ Handling multi-color SVGs

**System is fully functional and ready for drawing!** 🎉
