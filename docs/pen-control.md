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
Pen calibration and setup. Configures the pen drop angle/distance for each pen.
Not typically needed in normal operation.

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

### Initialization
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

1. **Always initialize with G77** before using pen commands
2. **Select pen with Z value** before lowering (G90, G1 Z89)
3. **Switch between G90/G91** when raising pen:
   - Use G90 for pen up (Z absolute position)
   - Use G91 for X/Y movements (relative deltas)
4. **Default pen drop** is 30 units (can be customized per pen via G100)
5. **Always raise pen before** moving to prevent dragging

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
