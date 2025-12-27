; Simple Circle Example
; Draws a 50mm radius circle using arc command
G21 ; Set units to mm
G90 ; Absolute positioning
M17 ; Enable steppers
G92 X0 Y0 ; Set current position as origin
G1 F1000 ; Set feed rate

; Move to start position
G1 X50 Y0

; Draw circle using arc (G2 = clockwise arc)
; Format: G2 X[end_x] Y[end_y] I[center_offset_x] J[center_offset_y]
G2 X50 Y0 I-50 J0

M400 ; Wait for moves to finish
M18 ; Disable steppers
