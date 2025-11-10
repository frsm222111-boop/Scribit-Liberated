# Scribit Pen Control

## Overview
Scribit uses custom G-codes (G100, G101) and the Z axis for pen selection and control.

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
Pen holder calibration command. Should be called during initialization.

### G100
**Pen calibration command - REQUIRED for proper pen contact!**

Automatically calibrates the exact distance needed to press the pen against the wall:
1. Selects the current pen (based on Z value: 89, 161, 233, or 305)
2. Lowers the pen holder by 30 units while monitoring IMU (gyroscope)
3. Detects vibration when pen tip contacts wall
4. Calculates and stores the exact drop distance for that specific pen
5. Raises pen back up

**IMPORTANT:** Run G100 for each pen before first use to ensure proper wall contact!

### G101
**Pen down** command.

Lowers the currently selected pen by a configured amount (default 30 units).

Implementation (from g101.h):
```cpp
mechanics.destination[Z_AXIS] = mechanics.destination[Z_AXIS] - g_timeLimit[l_selectedPen];
```

Default `g_timeLimit` = 30 for all pens.

### Pen Up
To raise the pen, set Z back to the pen selection value:
```gcode
G90        ; Absolute positioning
G1 Z89     ; Raise pen (for pen 1)
G91        ; Back to relative positioning
```

## Complete Pen Control Sequence

### Initialization (First Time Setup)
```gcode
M17        ; Enable steppers
G77        ; Pen holder calibration

; Calibrate pen 1
G90        ; Absolute positioning
G1 Z89     ; Select pen 1
G100       ; AUTO-CALIBRATE pen 1 drop distance (uses IMU)

; Calibrate pen 2 (if using multiple pens)
G90
G1 Z161    ; Select pen 2
G100       ; Auto-calibrate pen 2

; Calibrate pen 3
G90
G1 Z233    ; Select pen 3
G100       ; Auto-calibrate pen 3

; Calibrate pen 4
G90
G1 Z305    ; Select pen 4
G100       ; Auto-calibrate pen 4

; Return to pen 1 and prepare for drawing
G90
G1 Z89     ; Select pen 1, pen up
G91        ; Relative positioning for X/Y movements
G1 F1000   ; Set feedrate
```

### Initialization (After Calibration)
```gcode
M17        ; Enable steppers
G77        ; Pen holder calibration
G90        ; Absolute positioning
G1 Z89     ; Select pen 1, pen up position
G91        ; Relative positioning for X/Y movements
G1 F1000   ; Set feedrate
```

### Drawing Workflow

**Move to position (pen up):**
```gcode
G1 X100 Y50    ; Move with pen up
```

**Lower pen:**
```gcode
G101           ; Pen down
```

**Draw:**
```gcode
G1 X200 Y100   ; Draw line
G1 X150 Y200   ; Draw another line
```

**Raise pen:**
```gcode
G90            ; Switch to absolute
G1 Z89         ; Raise pen
G91            ; Back to relative
```

**Move to new position:**
```gcode
G1 X-50 Y-100  ; Move to new location
```

**Lower pen and continue:**
```gcode
G101           ; Pen down
G1 X100 Y0     ; Draw
```

### Finish
```gcode
G90            ; Absolute positioning
G1 Z89         ; Ensure pen is up
M18            ; Disable steppers
```

## Important Notes

1. **Run G100 calibration for each pen on first use!** This uses the IMU to detect wall contact and sets the correct drop distance
2. **Always initialize with G77** before using pen commands
3. **Select pen with Z value** before lowering (G90, G1 Z89)
4. **Switch between G90/G91** when raising pen:
   - Use G90 for pen up (Z absolute position)
   - Use G91 for X/Y movements (relative deltas)
5. **Default pen drop** is 30 units (before calibration). After G100, each pen has its own calibrated distance
6. **Always raise pen before** moving to prevent dragging
7. **G100 requires working IMU** - if IMU unavailable, falls back to 30-unit default

## Mode Switching Pattern

The firmware requires switching between absolute and relative modes:

```gcode
G91            ; Relative for movements
G1 X50 Y50     ; Move (relative)
G101           ; Pen down
G1 X100 Y100   ; Draw (relative)
G90            ; Switch to absolute
G1 Z89         ; Pen up (absolute Z)
G91            ; Back to relative
G1 X-50 Y-50   ; Move (relative)
```

## Example: Draw Square

```gcode
M17            ; Enable steppers
G77            ; Calibrate pen holder
G90            ; Absolute mode
G1 Z89         ; Select pen 1, pen up
G91            ; Relative mode
G1 F1000       ; Set feedrate

; Move to start
G1 X0 Y0       ; At start position

; Draw square
G101           ; Pen down
G1 X100 Y0     ; Right edge
G1 X0 Y100     ; Down edge
G1 X-100 Y0    ; Left edge
G1 X0 Y-100    ; Up edge (close square)

; Finish
G90            ; Absolute mode
G1 Z89         ; Pen up
M18            ; Disable steppers
```

## Implementation Files

Source code location:
- `Firmware/MK4duo/src/core/commands/gcode/scribit/g100.h` - G100 implementation
- `Firmware/MK4duo/src/core/commands/gcode/scribit/g101.h` - G101 implementation

## Usage in Scripts

All drawing scripts (square, circle, SVG) automatically handle:
- Pen initialization (M17, G77, G90, G1 Z89)
- Pen down when drawing (G101)
- Pen up when moving (G90, G1 Z89, G91)
- Pen up before return to start
- Mode switching between G90/G91
