M17

; homing the pen holder cylinder
G77

; pause 1 second
G4 P1000

; TEST PEN 1
; in absolute mode go to 160 to overshoort pen 1
G90
G1 Z160

; pause 1 second
G4 P1000

; in relative mode go back 70 to engage the lowering mechanism and get to pen1 up 
G91
G1 Z-70

; pause 1 second
G4 P1000

; to go down go another 30 back 
G91
G1 Z-30

; pause 1 second
G4 P1000

; to go up go 30 forward 
G91
G1 Z30

M18
