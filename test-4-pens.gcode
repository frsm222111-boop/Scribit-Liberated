; Test all 4 pens without G77/G28
M17              ; Enable steppers
G90              ; Absolute positioning
G92 X0 Y0 Z0     ; Set current position as origin

; Pen 0 - should already be here
G4 P1000
G1 F1000 X10 Y0
G1 X20 Y0
G1 X0 Y0
G4 P1000

; Switch to Pen 1 (72 degrees)
G91              ; Relative mode
G1 F200 Z72      ; Rotate 72 degrees
G90              ; Back to absolute
G4 P2000         ; Wait for rotation
G1 F1000 X10 Y10
G1 X20 Y10
G1 X0 Y0
G4 P1000

; Switch to Pen 2 (144 degrees total)
G91
G1 F200 Z72      ; Another 72 degrees
G90
G4 P2000
G1 F1000 X10 Y20
G1 X20 Y20
G1 X0 Y0
G4 P1000

; Switch to Pen 3 (216 degrees total)
G91
G1 F200 Z72      ; Another 72 degrees
G90
G4 P2000
G1 F1000 X10 Y30
G1 X20 Y30
G1 X0 Y0
G4 P1000

; Back to Pen 0 (288 degrees total)
G91
G1 F200 Z72      ; Final 72 degrees
G90
G4 P2000

M18              ; Disable steppers
