# Scribit G-code Reference

Complete reference for Scribit G-code commands, coordinate system, and pen control.

## Table of Contents
- [Coordinate System](#coordinate-system)
- [Movement Commands](#movement-commands)
- [Pen Control](#pen-control)
- [Custom Commands](#custom-commands)

---

## Coordinate System

Scribit uses a **dual-string system** with G91 (relative mode) coordinate mapping.

### G91 Coordinate Mapping

```
G-code X = Left string delta
G-code Y = -Right string delta (NEGATED!)
```

**Example:**
```gcode
G91             ; Relative mode
G1 X10 Y-5      ; Left +10mm, Right +5mm
```

### String Length Calculation

Given Cartesian position (x, y) and anchor distance d:
```
left_length = √(x² + y²)
right_length = √((d-x)² + y²)
```

---

## Movement Commands

### G1 - Linear Move

```gcode
G1 X{left_delta} Y{-right_delta} F{feedrate}
```

**Parameters:**
- `X` - Left string delta (mm)
- `Y` - Negative right string delta (mm)
- `F` - Feedrate (mm/min), default 1000

**Example:**
```gcode
G1 F1000        ; Set feedrate
G1 X50 Y-50     ; Move both strings +50mm
```

### G90 - Absolute Positioning Mode

```gcode
G90
```

Used only for pen selection (Z-axis absolute positioning).

### G91 - Relative Positioning Mode

```gcode
G91
```

**Default mode for all XY movement.**

---

## Pen Control

Scribit uses **overshoot method** for reliable pen engagement.

### Initialization (Required at start)

```gcode
M17             ; Enable steppers
G77             ; Home pen cylinder
G90             ; Absolute mode
G1 Z160         ; Pen1 with 100° overshoot
G91             ; Relative mode
G1 Z-70         ; Return to engage → pen1 up
```

**Result:** Pen1 up, ready to draw

### Pen Down/Up

```gcode
G1 Z-30         ; Pen down
G1 Z30          ; Pen up
```

### Switching to Next Pen (2, 3, or 4)

```gcode
G1 Z30          ; Pen up (if down)
G1 Z72          ; Rotate 72° to next pen
G1 Z60          ; Overshoot 60°
G1 Z-60         ; Return to engage → next pen up
```

### Special Case: Pen 4 → Pen 1

```gcode
G1 Z30          ; Pen up (if down)
G1 Z72          ; First 72° rotation
G1 Z72          ; Second 72° rotation
G1 Z60          ; Overshoot 60°
G1 Z-60         ; Return to engage → pen1 up
```

### Pen Mapping

| Pen | Color | Position |
|-----|-------|----------|
| 1   | Black | Start    |
| 2   | Red   | +72°     |
| 3   | Blue   | +144°    |
| 4   | Green  | +216°    |

---

## Custom Commands

### G77 - Home Pen Cylinder

```gcode
G77
```

**Purpose:** Homes pen holder cylinder to reference position
**Usage:** Call once at start (before pen selection)
**Important:** Do not call between pen changes

### G4 - Dwell/Pause

```gcode
G4 P{milliseconds}
```

**Example:**
```gcode
G4 P1000        ; Pause 1 second
```

### M17 - Enable Steppers

```gcode
M17
```

Enables all stepper motors. Call at start of program.

### M18 - Disable Steppers

```gcode
M18
```

Disables all stepper motors. Call at end of program.

---

## Complete Drawing Example

```gcode
; Initialize
M17
G77             ; Home cylinder
G90
G1 Z160         ; Pen1 overshoot
G91
G1 Z-70         ; Engage pen1 up
G1 F1000        ; Set feedrate

; Draw square with pen 1
G1 X50 Y-50     ; Move to start
G1 Z-30         ; Pen down
G1 X100 Y0      ; Right edge
G1 X0 Y100      ; Bottom edge
G1 X-100 Y0     ; Left edge
G1 X0 Y-100     ; Top edge
G1 Z30          ; Pen up

; Switch to pen 2
G1 Z72          ; Rotate
G1 Z60          ; Overshoot
G1 Z-60         ; Engage pen2 up

; Draw with pen 2
G1 X150 Y-50    ; Move to position
G1 Z-30         ; Pen down
G1 X50 Y0       ; Draw line
G1 Z30          ; Pen up

; Finish
M18
```

---

## Key Principles

1. **G77 once** - Home only at initialization
2. **Always start pen1 up** - Consistent state after homing
3. **Overshoot required** - 100° init, 60° switches
4. **Return engages** - Moving back activates mechanism
5. **±30 for control** - Simple up/down once engaged
6. **72° between pens** - Consistent spacing
7. **All relative mode** - G91 for all XY movement

---

## Troubleshooting

**Pen doesn't engage:**
- Ensure Z160, Z-70 for initialization
- Ensure Z60 overshoot for switches
- Return same amount (-60) after overshoot

**Pen won't go down:**
- Verify pen is up (Z=0 relative)
- Ensure mechanism engaged (overshoot done)

**Wrong pen selected:**
- Count rotations: each Z72 = next pen
- Use double Z72 for pen4→pen1

**Coordinates wrong:**
- Remember Y is negated in G91 mode
- Check anchor distance setting
