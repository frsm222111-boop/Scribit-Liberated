# ✅ CALIBRATED PEN POSITIONS - OVERSHOOT METHOD

## Pen Mechanism Discovery

Pen cylinder requires **overshoot and return** to engage lowering mechanism:
- Initial overshoot engages mechanism
- Return to position completes engagement
- Always start in **pen1 up** position after homing

## Initialization (ONCE at start)

```gcode
M17          ; Enable steppers
G77          ; Home pen cylinder
G90          ; Absolute mode
G1 Z160      ; Go to pen1 up with 100° overshoot
G91          ; Relative mode
G1 Z-70      ; Return 70° to engage mechanism → pen1 up
```

**Result:** Pen1 up position, ready to draw

## Pen 1 Control

From pen1 up:
```gcode
G1 Z-30      ; Pen down
G1 Z30       ; Pen up
```

## Moving to Next Pen (Pen 2, 3, or 4)

From any pen up position:
```gcode
G1 Z72       ; Rotate 72° to next pen position
G1 Z60       ; Overshoot 60°
G1 Z-60      ; Return 60° to engage → next pen up
G1 Z-30      ; Pen down
G1 Z30       ; Pen up
```

## Special Case: Pen 4 → Pen 1

From pen4 up:
```gcode
G1 Z72       ; Rotate 72° (first step)
G1 Z72       ; Rotate 72° (second step)
G1 Z60       ; Overshoot 60°
G1 Z-60      ; Return 60° to engage → pen1 up
G1 Z-30      ; Pen down
G1 Z30       ; Pen up
```

## Summary Table

| Action | Command | Notes |
|--------|---------|-------|
| Home cylinder | G77 | Once at start |
| To pen1 up (init) | G90, G1 Z160, G91, G1 Z-70 | 100° overshoot, return 70° |
| Pen down | G1 Z-30 | From pen up |
| Pen up | G1 Z30 | From pen down |
| Next pen (2,3,4) | Z72, Z60, Z-60 | 72° rotation + 60° overshoot |
| Pen4 → Pen1 | Z72, Z72, Z60, Z-60 | Double 72° rotation + overshoot |

## Key Principles

1. **Home once** - G77 only at initialization
2. **Always start pen1 up** - Z160, Z-70 after homing
3. **Overshoot required** - 100° for initial pen1, 60° for pen switches
4. **Return engages mechanism** - Going back activates lowering
5. **±30 for up/down** - Simple relative motion once engaged
6. **72° between pens** - Pens spaced at 72° intervals
7. **Pen4→Pen1 special** - Requires double 72° move

## Test Files

✅ `gcode/test-pens-home.gcode` - Home cylinder
✅ `gcode/test-home-pen1-up-down-up.gcode` - Pen1 initialization and control
✅ `gcode/test-pen-up-next-pen-up-down-up.gcode` - Move to next pen
✅ `gcode/test-pen4-up-to-pen1-up.gcode` - Pen4 to pen1 transition

## Verification

Run test files to verify:
1. Cylinder homes with G77
2. Initial overshoot (160°) and return (-70°) engages mechanism
3. Pen down/up with ±30 works correctly
4. Pen switching with 72° + 60° overshoot works
5. Pen4 to pen1 with double 72° works
