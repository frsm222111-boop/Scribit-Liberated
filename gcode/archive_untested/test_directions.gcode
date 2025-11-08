; Test 4 cardinal directions from current position
; Current: L1=1930, L2=1828 -> pos (1216, 1513)
; Each move is 100mm, with 2 second pause between

M17
G90
G1 F500

; Move UP (toward anchors)
G1 X-94.42 Y-99.80
G4 P2000

; Return to start
G1 X94.42 Y99.80
G4 P2000

; Move DOWN (away from anchors)
G1 X66.20 Y69.92
G4 P2000

; Return to start
G1 X-66.20 Y-69.92
G4 P2000

; Move LEFT
G1 X-72.83 Y39.06
G4 P2000

; Return to start
G1 X72.83 Y-39.06
G4 P2000

; Move RIGHT
G1 X46.13 Y-66.50
G4 P2000

; Return to start
G1 X-46.13 Y66.50

M18
