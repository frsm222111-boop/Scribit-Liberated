M17

; homing the pen holder cylinder
G77

; TEST PEN 1
; in absolute mode go to 89 and call g101 twice to make sure the pen sits correctly at the center
G90
G1 Z89
G101
G101

; in relative mode raise the pen by moving z30
G91
G1 Z30

; pause 1 second
G4 P1000

; lower the pen using z-30
G1 Z-30

; pause 1 second with pen down
G4 P1000

; raise pen
G1 Z30

; pause before next pen
G4 P1000

; TEST PEN 2
; select pen 2
G90
G1 Z161
G101
G101

; raise pen
G91
G1 Z30

; pause 1 second
G4 P1000

; lower pen
G1 Z-30

; pause 1 second with pen down
G4 P1000

; raise pen
G1 Z30

; pause before next pen
G4 P1000

; TEST PEN 3
; select pen 3
G90
G1 Z233
G101
G101

; raise pen
G91
G1 Z30

; pause 1 second
G4 P1000

; lower pen
G1 Z-30

; pause 1 second with pen down
G4 P1000

; raise pen
G1 Z30

; pause before next pen
G4 P1000

; TEST PEN 4
; select pen 4
G90
G1 Z305
G101
G101

; raise pen
G91
G1 Z30

; pause 1 second
G4 P1000

; lower pen
G1 Z-30

; pause 1 second with pen down
G4 P1000

; raise pen
G1 Z30

M18
