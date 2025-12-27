; Simple Square Example
; Draws a 100x100mm square
G21 ; Set units to mm
G90 ; Absolute positioning
M17 ; Enable steppers
G92 X0 Y0 ; Set current position as origin
G1 F1000 ; Set feed rate to 1000 mm/min

; Draw square
G1 X100 Y0 ; Move to bottom right
G1 X100 Y100 ; Move to top right
G1 X0 Y100 ; Move to top left
G1 X0 Y0 ; Move back to origin

M400 ; Wait for moves to finish
M18 ; Disable steppers
