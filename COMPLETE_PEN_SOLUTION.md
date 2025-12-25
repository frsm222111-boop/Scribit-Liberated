# ✅ COMPLETE PEN CONTROL SOLUTION - OVERSHOOT METHOD

## Discovery Summary

After hardware testing and experimentation, the **overshoot method** has been discovered and verified. This method uses mechanical overshoot and return to engage the pen lowering mechanism.

## The Evolution

1. **Initial Discovery**: Z-axis controls pen selection (rotation) and pen extension (translation)
2. **Absolute Position Method**: Used positions 89/161/233/305 with G101 and Z±72 motion
3. **Overshoot Method**: Discovered that overshoot and return engages lowering mechanism - simpler and more reliable!

## The Solution

### Core Principle: Overshoot and Return

The pen cylinder mechanism requires **overshoot followed by return** to engage:
1. **Overshoot**: Move past target position
2. **Return**: Move back to engage lowering mechanism
3. **Control**: Use ±30 for pen down/up once engaged

### Always Start at Pen1 Up

After homing, always initialize to pen1 up position:
- This provides a consistent starting state
- Simplifies pen switching logic
- Eliminates need for absolute position tracking

## Complete Initialization Sequence

```gcode
M17          ; Enable steppers
G77          ; Home pen cylinder (ONCE!)
G90          ; Absolute positioning mode
G1 Z160      ; Go to pen1 with 100° overshoot
G91          ; Relative positioning mode
G1 Z-70      ; Return 70° to engage mechanism → pen1 up
G1 F1000     ; Set feedrate
```

**Result:** Pen1 up, mechanism engaged, ready to draw

## Pen 1 Control (Black)

From pen1 up position:

**Pen Down:**
```gcode
G1 Z-30      ; Move back 30° = PEN DOWN
```

**Pen Up:**
```gcode
G1 Z30       ; Move forward 30° = PEN UP
```

## Moving to Next Pen (2, 3, 4)

From current pen up position to next pen:

**Next Pen Sequence:**
```gcode
G1 Z72       ; Rotate 72° to next pen position
G1 Z60       ; Overshoot 60°
G1 Z-60      ; Return 60° to engage → next pen up
```

**Then control next pen:**
```gcode
G1 Z-30      ; Pen down
G1 Z30       ; Pen up
```

### Example: Pen 1 → Pen 2

```gcode
; Assuming at pen1 up
G1 Z72       ; Rotate to pen2
G1 Z60       ; Overshoot
G1 Z-60      ; Return → pen2 up
G1 Z-30      ; Pen2 down
; ... drawing ...
G1 Z30       ; Pen2 up
```

## Special Case: Pen 4 → Pen 1

Moving from pen4 back to pen1 requires **double 72° rotation**:

```gcode
; From pen4 up
G1 Z72       ; First 72° rotation
G1 Z72       ; Second 72° rotation (total 144°)
G1 Z60       ; Overshoot 60°
G1 Z-60      ; Return 60° to engage → pen1 up
```

**Why double rotation?**
- Pens are at 72° intervals (360°/5 positions)
- Pen4 is at position 3 (3×72° = 216° from home)
- Pen1 is at position 0 (0° from home)
- Forward path: 4→5→1 = 2×72° = 144°
- Backward path would be 216° - not recommended

## Complete Working Example

### Test All 4 Pens

File: `gcode/test-pens-complete.gcode`

```gcode
M17
G77          ; Home cylinder

; Initialize to pen1 up
G90
G1 Z160      ; 100° overshoot
G91
G1 Z-70      ; Engage → pen1 up

G4 P1000     ; Pause

; Pen 1 down/up
G1 Z-30      ; Pen1 down
G4 P1000
G1 Z30       ; Pen1 up
G4 P1000

; Move to pen 2
G1 Z72       ; Rotate to pen2
G1 Z60       ; Overshoot
G1 Z-60      ; Engage → pen2 up
G4 P1000

; Pen 2 down/up
G1 Z-30      ; Pen2 down
G4 P1000
G1 Z30       ; Pen2 up
G4 P1000

; Move to pen 3
G1 Z72       ; Rotate to pen3
G1 Z60       ; Overshoot
G1 Z-60      ; Engage → pen3 up
G4 P1000

; Pen 3 down/up
G1 Z-30      ; Pen3 down
G4 P1000
G1 Z30       ; Pen3 up
G4 P1000

; Move to pen 4
G1 Z72       ; Rotate to pen4
G1 Z60       ; Overshoot
G1 Z-60      ; Engage → pen4 up
G4 P1000

; Pen 4 down/up
G1 Z-30      ; Pen4 down
G4 P1000
G1 Z30       ; Pen4 up
G4 P1000

; Return to pen 1
G1 Z72       ; First rotation
G1 Z72       ; Second rotation
G1 Z60       ; Overshoot
G1 Z-60      ; Engage → pen1 up
G4 P1000

M18
```

### Drawing Example

```gcode
M17
G77          ; Home cylinder

; Initialize to pen1 up
G90
G1 Z160
G91
G1 Z-70
G1 F1000

; Draw square with pen 1
G1 X50 Y-50       ; Move to start (pen up)
G1 Z-30           ; Pen down
G1 X100 Y0        ; Right edge
G1 X0 Y100        ; Bottom edge
G1 X-100 Y0       ; Left edge
G1 X0 Y-100       ; Top edge
G1 Z30            ; Pen up

; Switch to pen 2 and draw
G1 Z72            ; Rotate to pen2
G1 Z60            ; Overshoot
G1 Z-60           ; Engage → pen2 up

G1 X150 Y-50      ; Move to new position
G1 Z-30           ; Pen down
G1 X50 Y0         ; Draw line
G1 Z30            ; Pen up

M18
```

## Technical Details

### Z-Axis Mechanism

The Z-axis stepper motor controls a cylinder that:
1. **Rotates** to select one of 4 pens (72° spacing)
2. **Translates** forward/backward to extend/retract selected pen

### Why Overshoot Works

The overshoot-and-return motion mechanically engages the lowering system:
1. **Overshoot** positions the cylinder past the target
2. **Return** activates internal mechanism that enables pen lowering
3. **±30 motion** then controls pen up/down

This is more elegant than absolute positioning because:
- No need to track absolute positions
- No need for G101 correction commands
- Simpler state management
- More mechanically reliable

### Relative Z Position Tracking

Track relative Z position during drawing:
- **After init** (pen1 up): Z position = 0
- **After pen down**: Z position = -30
- **After pen up**: Z position = 0
- **After pen switch**: Z position = 0 (always at new pen up)

## Pen Switching State Machine

```
START: Home (G77)
  ↓
Pen1 Up (Z160, Z-70)
  ↓
┌─────────────────┐
│  Current Pen Up │ ← Entry point for all pens
└────────┬────────┘
         │
    ┌────┴────┐
    │  Z-30   │ Pen Down
    └────┬────┘
         │
    ┌────┴────┐
    │  Z+30   │ Pen Up
    └────┬────┘
         │
    ┌────┴────┐
    │ Switch? │
    └────┬────┘
         │
    Yes  │  No (continue drawing)
         ↓
┌────────────────┐
│ Next Pen?      │
├────────────────┤
│ Pen 2,3,4:     │
│  Z72, Z60, Z-60│
│ Pen 4→1:       │
│  Z72, Z72,     │
│  Z60, Z-60     │
└────────┬───────┘
         │
         └──→ Back to "Current Pen Up"
```

## Key Principles

1. **G77 ONCE** - Home cylinder only at initialization
2. **Always start pen1 up** - Consistent initial state
3. **Overshoot required** - 100° for init, 60° for switches
4. **Return engages** - Moving back activates lowering mechanism
5. **±30 for control** - Simple up/down once engaged
6. **72° between pens** - Consistent pen spacing
7. **Pen4→Pen1 special** - Double 72° rotation forward
8. **All relative mode** - No absolute positioning needed after init

## Command Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| M17 | Enable steppers | Start of program |
| G77 | Home cylinder | Once at initialization |
| G90 | Absolute mode | Only for initial Z160 |
| G1 Z160 | Go to pen1 with overshoot | Initialization only |
| G91 | Relative mode | After Z160, stay in this mode |
| G1 Z-70 | Engage pen1 | After Z160 overshoot |
| G1 Z-30 | Pen down | When pen is up |
| G1 Z30 | Pen up | When pen is down |
| G1 Z72 | Rotate to next pen | Pen switching |
| G1 Z60 | Overshoot for switch | After Z72 rotation |
| G1 Z-60 | Engage after switch | After overshoot |
| M18 | Disable steppers | End of program |

## Files Updated

✅ `CALIBRATED_PEN_VALUES.md` - Updated with overshoot method
✅ `COMPLETE_PEN_SOLUTION.md` - This file
✅ `gcode/test-pens-home.gcode` - Home test
✅ `gcode/test-home-pen1-up-down-up.gcode` - Pen1 initialization test
✅ `gcode/test-pen-up-next-pen-up-down-up.gcode` - Pen switching test
✅ `gcode/test-pen4-up-to-pen1-up.gcode` - Pen4→Pen1 test

## Verification

Run test files to verify:
1. **Home**: Cylinder homes to reference position
2. **Init**: Z160, Z-70 engages pen1 up correctly
3. **Pen control**: Z±30 moves pen down/up
4. **Pen switch**: Z72, Z60, Z-60 switches to next pen
5. **Wrap around**: Z72, Z72, Z60, Z-60 returns pen4→pen1
6. **Smooth operation**: No grinding, clean movements

## Common Issues & Solutions

**Pen doesn't engage:**
- ✅ Ensure using Z160, Z-70 for initialization
- ✅ Ensure using Z60 overshoot for pen switches
- ✅ Ensure returning same amount (-60) after overshoot

**Pen won't go down:**
- ✅ Verify pen is in up position (Z=0 relative)
- ✅ Use Z-30 to lower
- ✅ Ensure mechanism was engaged (overshoot/return done)

**Pen won't go up:**
- ✅ Verify pen is in down position (Z=-30 relative)
- ✅ Use Z+30 to raise
- ✅ Don't use Z+30 when already up (no-op or error)

**Wrong pen selected:**
- ✅ Count rotations: each Z72 moves to next pen
- ✅ Use double Z72 for pen4→pen1
- ✅ Track current pen state in code

**Pen 4 → Pen 1 fails:**
- ✅ Must use Z72, Z72 (not single Z144)
- ✅ Add overshoot Z60, return Z-60 after rotations

## Success Criteria

When test files run correctly, you should observe:
1. **Clean rotation** - Smooth 72° movements
2. **Overshoot motion** - Visible Z60 overshoot
3. **Return engagement** - Audible/visible engagement on Z-60
4. **Pen extension** - Pen touches wall on Z-30
5. **Pen retraction** - Pen lifts on Z+30
6. **Reliable switching** - Consistent pen changes
7. **No errors** - Smooth operation throughout

This confirms the overshoot method is working! 🎉

## Advantages of Overshoot Method

1. ✅ **Simpler** - No absolute position tracking needed
2. ✅ **Reliable** - Mechanical engagement is robust
3. ✅ **Consistent** - Same pattern for all pen switches
4. ✅ **Elegant** - Uses natural mechanical motion
5. ✅ **Stateless** - Always returns to "pen up" state
6. ✅ **Hardware verified** - Tested on actual Scribit
7. ✅ **Easy to implement** - Clear state machine
