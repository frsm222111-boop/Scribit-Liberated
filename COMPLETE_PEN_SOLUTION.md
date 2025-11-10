# ✅ COMPLETE PEN CONTROL SOLUTION - FINAL SIMPLE METHOD

## Discovery Summary

After extensive firmware analysis and hardware testing, the **final simple method** has been verified working for all 4 pens.

## The Evolution

1. **Initial Discovery**: Z-axis controls both pen selection (rotation) and pen extension (translation)
2. **First Method**: Base+100 positions with G1 Z-100 for pen down
3. **Two-Stage Method**: G101 + G1 Z-100 for pen down (pens 1-3 worked, pen 4 stuck)
4. **Final Simple Method**: G101 after selection + Z72/-72 motion for pen down (**ALL 4 PENS WORK!**)

## The Solution

### Pen Control Uses Z-Axis in TWO Modes:

1. **Absolute Mode (G90)**: Selects which pen by rotating cylinder to absolute position
2. **Relative Mode (G91)**: Extends/retracts pen using forward-back motion

### Correct Pen Positions (Absolute)

| Pen | Color | Absolute Z | Spacing |
|-----|-------|------------|---------|
| 1   | Black | **89**     | Base    |
| 2   | Red   | **161**    | +72     |
| 3   | Blue  | **233**    | +72     |
| 4   | Green | **305**    | +72     |

### Correct Pen Commands

**Pen Selection (absolute mode):**
```gcode
G90         ; Absolute positioning
G1 Z89      ; Select pen 1 (or 161/233/305 for pens 2/3/4)
G101        ; Correct overshoot
G91         ; Relative positioning
```

**Pen Down (relative mode, forward-back motion):**
```gcode
G1 Z72      ; Move forward
G1 Z-72     ; Move back = PEN DOWN!
```

**Pen Up (relative mode, from -72 position):**
```gcode
G1 Z72      ; Move forward = PEN UP!
```

## Complete Working Example

### Test All 4 Pens

File: `gcode/test-pens-absolute.gcode`

```gcode
M17         ; Enable steppers
G77         ; Home pen cylinder (ONCE!)

; Pen 1 (Black)
G90         ; Absolute mode
G1 Z89      ; Select pen 1
G101        ; Correct overshoot

G91         ; Relative mode
G1 Z72      ; Forward
G1 Z-72     ; Back = PEN DOWN!

; Pen 2 (Red)
G90
G1 Z161     ; Select pen 2
G101

G91
G1 Z72
G1 Z-72

; Pen 3 (Blue)
G90
G1 Z233     ; Select pen 3
G101

G91
G1 Z72
G1 Z-72

; Pen 4 (Green) - NOW WORKS!
G90
G1 Z305     ; Select pen 4
G101

G91
G1 Z72
G1 Z-72

M18         ; Disable steppers
```

### Drawing Example

```gcode
M17
G77         ; Home cylinder ONCE at start
G90
G1 Z89      ; Select pen 1
G101        ; Correct overshoot
G91
G1 F1000

; Draw square
G1 X50 Y-50      ; Move to start (pen up)
G1 Z72           ; Forward
G1 Z-72          ; Back = pen down!
G1 X100 Y0       ; Right edge
G1 X0 Y100       ; Bottom edge
G1 X-100 Y0      ; Left edge
G1 X0 Y-100      ; Top edge
G1 Z72           ; Pen up

; Move and draw with pen 2
G90
G1 Z161          ; Select pen 2
G101
G91
G1 X150 Y-50     ; Move to new position
G1 Z72           ; Forward
G1 Z-72          ; Back = pen down!
; ... drawing commands ...
G1 Z72           ; Pen up

M18
```

## Updated SVG Converter

The SVG to G-code converter has been updated with final simple method:

**Changes Made:**
1. ✅ Initialization uses G77 (once), G90, Z89, G101, G91
2. ✅ Pen down changed to `G1 Z72` followed by `G1 Z-72`
3. ✅ Pen up changed to `G1 Z72` (from -72 position)
4. ✅ Pen switching uses absolute positions (89/161/233/305) with G101
5. ✅ All 4 pens now work (green maps to pen 4, not pen 3)
6. ✅ Tracks relative Z position (0 = up, -72 = down)

**Test Output:**
```gcode
M17
G77
G90
G1 Z89       ; Pen 1
G101         ; Correct overshoot
G91
G1 F1000
G1 X-33.085 Y33.085    ; Move to start
G1 Z72                 ; Forward
G1 Z-72                ; Back = pen down! ✅
G1 X36.985 Y-11.152    ; Draw
...
G1 Z72                 ; Pen up ✅
M18
```

## Technical Details

### Z-Axis Mechanism

The Z-axis stepper motor controls a cylinder that:
1. **Rotates** to select one of 4 pens (4 rotational positions at 72° spacing)
2. **Translates forward/backward** to extend/retract the selected pen

### Why Forward-Back Motion Works

The **G1 Z72** followed immediately by **G1 Z-72** creates a mechanical action:
1. Z72 moves cylinder forward, positioning pen near wall
2. Z-72 moves cylinder back while pen tip contacts wall
3. The forward-back motion ensures proper pen extension and wall contact
4. This elegant solution works for all 4 pens!

### Why G101 is Needed

- **G101** makes a small calibration move after pen selection (~30 units)
- It corrects for overshoot when rotating to absolute position
- Must be called in relative mode after G90 pen selection
- Critical for accurate pen positioning

### Relative Z Position Tracking

When drawing, track the relative Z position:
- **At pen selection**: Z position = 0 (relative)
- **After pen down** (Z72, Z-72): Z position = -72 (relative)
- **After pen up** (Z72): Z position = 0 (relative)

## Key Principles

1. **G77 ONCE** - Home cylinder at start only (not between pen changes)
2. **G90 for selection** - Use absolute mode to select pen position
3. **G101 after selection** - Always correct overshoot after rotating
4. **G91 for drawing** - Use relative mode for all X/Y movement and pen up/down
5. **Z72, Z-72 for down** - Forward-back motion extends pen
6. **Z72 for up** - Single forward motion retracts pen (from -72 position)
7. **All 4 pens work** - No mechanical issues with this method!

## What Each Command Does

- **M17**: Enable stepper motors
- **G77**: Home pen holder cylinder to zero position (call once!)
- **G90**: Switch to absolute positioning mode
- **G1 Z[89/161/233/305]**: Rotate cylinder to pen position
- **G101**: Make small correction for overshoot (~30 units)
- **G91**: Switch to relative positioning mode
- **G1 Z72**: Move cylinder forward
- **G1 Z-72**: Move cylinder back (creates pen contact when after Z72)
- **M18**: Disable stepper motors

## Files Updated

- ✅ `docs/PEN_CONTROL_FINAL_SIMPLE.md` - Complete technical documentation
- ✅ `CALIBRATED_PEN_VALUES.md` - Updated with absolute positions
- ✅ `gcode/test-pens-absolute.gcode` - Working test for all 4 pens (user-created)
- ✅ `tools/scribit_svg_to_gcode.py` - Updated with final simple method
- ✅ `gcode/star_final_simple.gcode` - SVG converter test output
- ✅ `gcode/multicolor_final_simple.gcode` - Multi-color test with pen switching

## Verification

Run `gcode/test-pens-absolute.gcode` to verify:
1. Cylinder homes with G77
2. Each pen rotates to correct position (with G101 correction)
3. Forward motion (Z72) positions pen
4. Back motion (Z-72) extends pen to wall - you should see/hear contact
5. Forward motion (Z72) retracts pen from wall
6. **All 4 pens work correctly!**

## Advantages of This Method

1. ✅ **Simple** - Easy to understand and implement
2. ✅ **Reliable** - All 4 pens verified working
3. ✅ **Consistent** - Same pattern for all pens
4. ✅ **Elegant** - Uses natural forward-back mechanical motion
5. ✅ **G77 once** - No need to rehome during drawing
6. ✅ **Hardware verified** - Tested on actual Scribit device

## Common Issues & Solutions

**Pen doesn't touch wall:**
- ✅ Ensure using absolute positions (89/161/233/305, not old 172/244/316)
- ✅ Ensure calling G101 after pen selection
- ✅ Ensure using Z72 then Z-72 (both commands required)

**Pen doesn't lift:**
- ✅ Ensure in G91 mode
- ✅ Ensure using single `G1 Z72` (not Z100)
- ✅ Ensure you previously did Z72, Z-72 (can't go up if not down)

**Wrong pen selected:**
- ✅ Use G90 before selecting pen
- ✅ Use absolute position values (89/161/233/305)
- ✅ Call G77 at initialization
- ✅ Call G101 immediately after pen selection

**Pen 4 gets stuck:**
- ✅ Use final simple method (not old two-stage method)
- ✅ Ensure using Z72/-72 motion (not G101 + Z-100)
- ✅ Pen 4 works perfectly with this method!

## Success Criteria

When `gcode/test-pens-absolute.gcode` runs correctly, you should observe:

1. **Cylinder rotation** - Visible rotation to 4 different positions
2. **G101 correction** - Small adjustment after each rotation
3. **Forward motion** - Cylinder moves toward wall on Z72
4. **Wall contact** - Pen tip touches wall on Z-72 (visual or audible feedback)
5. **Pen retraction** - Cylinder moves away from wall on Z72
6. **Smooth operation** - No grinding, stuttering, or errors
7. **All 4 pens work** - Including pen 4 (green)!

This confirms the final simple method is working perfectly! 🎉
