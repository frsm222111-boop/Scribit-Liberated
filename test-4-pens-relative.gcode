; Test 4 pens using only relative movements
M17              ; Enable steppers
G91              ; Relative positioning
G1 F1000         ; Set feed rate

; Pen 0 - current position
G1 X10 Y0        ; Move right
G1 X10 Y0        ; Move more right
G1 X-20 Y0       ; Return
G4 P1000         ; Wait

; Switch to Pen 1 (72 degrees)
G1 F200 Z72
G4 P2000
G1 F1000 X10 Y10
G1 X10 Y0
G1 X-20 Y-10
G4 P1000

; Switch to Pen 2 (another 72 degrees)
G1 F200 Z72
G4 P2000
G1 F1000 X10 Y10
G1 X10 Y0
G1 X-20 Y-10
G4 P1000

; Switch to Pen 3 (another 72 degrees)
G1 F200 Z72
G4 P2000
G1 F1000 X10 Y10
G1 X10 Y0
G1 X-20 Y-10
G4 P1000

; Back to Pen 0 (another 72 degrees = 288 total)
G1 F200 Z72
G4 P2000

M18              ; Disable steppers
