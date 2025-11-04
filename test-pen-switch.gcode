; Scribit Pen Switching Test
; Tests all 4 pen positions with small movements

; Initialize
M17              ; Enable steppers
G28              ; Home X/Y
G77              ; Home pen cylinder (find magnetic reference)
G90              ; Absolute positioning
G92 X0 Y0        ; Set current position as origin

; Test Pen 0 (default position after G77)
G4 P2000         ; Wait 2 seconds
G1 F1000         ; Set feed rate
G1 Z-30          ; Press pen against wall
G1 X10 Y10       ; Small movement
G1 X20 Y10
G1 Z30           ; Lift pen
G4 P1000

; Switch to Pen 1
G77              ; Re-home cylinder
G1 Z90           ; Rotate to pen 1 (90 degrees)
G4 P2000         ; Wait 2 seconds
G1 Z-30          ; Press pen
G1 X30 Y10       ; Small movement
G1 X40 Y10
G1 Z30           ; Lift pen
G4 P1000

; Switch to Pen 2
G77              ; Re-home cylinder
G1 Z180          ; Rotate to pen 2 (180 degrees)
G4 P2000         ; Wait 2 seconds
G1 Z-30          ; Press pen
G1 X50 Y10       ; Small movement
G1 X60 Y10
G1 Z30           ; Lift pen
G4 P1000

; Switch to Pen 3
G77              ; Re-home cylinder
G1 Z270          ; Rotate to pen 3 (270 degrees)
G4 P2000         ; Wait 2 seconds
G1 Z-30          ; Press pen
G1 X70 Y10       ; Small movement
G1 X80 Y10
G1 Z30           ; Lift pen
G4 P1000

; Return to home
G77              ; Home cylinder back to pen 0
G1 Z0            ; Ensure at position 0
G28              ; Home X/Y
M18              ; Disable steppers
