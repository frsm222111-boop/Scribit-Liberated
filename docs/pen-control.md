# Scribit Pen Control

## Overview
Scribit uses custom G-codes (G77, G101) and the Z axis for pen selection and control.

## Pen Selection

The Z axis value selects which pen to use:

| Pen Number | Z Value |
|------------|---------|
| Pen 1      | 89      |
| Pen 2      | 161     |
| Pen 3      | 233     |
| Pen 4      | 305     |

## Commands

### G77
Pen holder homing/calibration command. Must be called during initialization to home the cylinder.

### G101
**Overshoot correction command - CRITICAL for proper pen positioning!**

After selecting a pen using absolute Z positioning (G1 Z89/161/233/305), the pen holder may overshoot slightly. G101 corrects this overshoot to ensure the pen is properly centered.

**IMPORTANT:** Call G101 TWICE after selecting a pen for proper seating:
```gcode
G90         ; Absolute mode
G1 Z89      ; Select pen 1
G101        ; First correction
G101        ; Second correction (ensures proper centering)
```

### Pen Up/Down in Relative Mode

After initialization, use relative Z movements for pen control:

**Pen Down:**
```gcode
G1 Z-30     ; Lower pen 30 units (in relative mode)
```

**Pen Up:**
```gcode
G1 Z30      ; Raise pen 30 units (in relative mode)
```

**IMPORTANT:** The Z±30 values are for relative mode (G91). DO NOT use Z±60 or Z±72 - those values do not work correctly.

## Complete Pen Control Sequence

### Initialization
```gcode
M17         ; Enable steppers
G77         ; Home cylinder
G90         ; Absolute positioning
G1 Z89      ; Select pen 1 (or 161/233/305 for pens 2/3/4)
G101        ; Correct overshoot (first call)
G101        ; Correct overshoot (second call - critical!)
G91         ; Switch to relative mode for drawing
G1 F1000    ; Set feedrate
```

### Drawing Workflow

**Move to position (pen up):**
```gcode
G1 X100 Y50    ; Move with pen up
```

**Lower pen:**
```gcode
G1 Z-30        ; Pen down (relative)
```

**Draw:**
```gcode
G1 X200 Y100   ; Draw line
G1 X150 Y200   ; Draw another line
```

**Raise pen:**
```gcode
G1 Z30         ; Pen up (relative)
```

**Move to new position:**
```gcode
G1 X-50 Y-100  ; Move to new location
```

**Lower pen and continue:**
```gcode
G1 Z-30        ; Pen down
G1 X100 Y0     ; Draw
```

### Switching Pens

To switch to a different pen during drawing:

```gcode
G1 Z30         ; Raise current pen (if down)
G90            ; Absolute mode
G1 Z161        ; Select pen 2
G101           ; Correct overshoot (first)
G101           ; Correct overshoot (second)
G91            ; Back to relative mode
; Continue drawing with new pen
```

### Finish
```gcode
G1 Z30         ; Ensure pen is up (if down)
M18            ; Disable steppers
```

## Important Notes

1. **Always call G101 TWICE after selecting a pen** - the second call ensures proper centering
2. **Always initialize with G77** to home the cylinder before using pen commands
3. **Use Z±30 for pen up/down in relative mode** (NOT Z±60 or Z±72)
4. **Select pen with absolute Z** (G90, G1 Z89/161/233/305) then correct with G101 twice
5. **Stay in relative mode (G91) for drawing** - only switch to G90 when changing pens
6. **Always raise pen before moving** to prevent dragging

## Mode Usage Pattern

The correct pattern is:

```gcode
; Initialization (absolute mode)
G90            ; Absolute
G1 Z89         ; Select pen
G101           ; Correct
G101           ; Correct again

; Drawing (relative mode)
G91            ; Relative for everything
G1 X50 Y50     ; Move (relative)
G1 Z-30        ; Pen down (relative)
G1 X100 Y100   ; Draw (relative)
G1 Z30         ; Pen up (relative)
G1 X-50 Y-50   ; Move (relative)

; Change pen (absolute mode)
G90            ; Absolute
G1 Z161        ; Select pen 2
G101           ; Correct
G101           ; Correct again
G91            ; Back to relative

; Continue drawing (relative mode)
G1 Z-30        ; Pen down
```

## Example: Draw Square with Pen 1

```gcode
M17            ; Enable steppers
G77            ; Home cylinder
G90            ; Absolute mode
G1 Z89         ; Select pen 1
G101           ; Correct overshoot
G101           ; Correct again
G91            ; Relative mode
G1 F1000       ; Set feedrate

; Move to start
G1 X0 Y0       ; At start position

; Draw square
G1 Z-30        ; Pen down
G1 X100 Y0     ; Right edge
G1 X0 Y100     ; Down edge
G1 X-100 Y0    ; Left edge
G1 X0 Y-100    ; Up edge (close square)

; Finish
G1 Z30         ; Pen up
M18            ; Disable steppers
```

## Implementation Files

Source code location:
- `Firmware/MK4duo/src/core/commands/gcode/scribit/g77.h` - G77 (homing)
- `Firmware/MK4duo/src/core/commands/gcode/scribit/g101.h` - G101 (overshoot correction)

## Key Differences from Previous Method

**CORRECTED (working):**
- Call G101 TWICE after pen selection
- Use Z±30 for pen up/down in relative mode
- Stay in G91 (relative) for all drawing operations

**INCORRECT (old method that didn't work):**
- Called G101 only once
- Used Z±60 or Z±72 for pen control
- Switched between G90/G91 frequently

## Usage in Scripts

All drawing scripts (square, circle, SVG converter) automatically handle:
- Pen initialization (M17, G77, G90, G1 Z89, G101, G101)
- Pen down when drawing (G1 Z-30 in relative mode)
- Pen up when moving (G1 Z30 in relative mode)
- Proper pen switching with double G101
- Staying in relative mode (G91) for all drawing
