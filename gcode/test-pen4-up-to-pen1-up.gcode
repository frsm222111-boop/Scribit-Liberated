M17


; assuming we're starting from pen4 up in relative mode go 72 twice + 60 overshoot
G91
G1 Z72
G1 Z72
G1 Z60

; pause 1 second
G4 P1000

; go back 60 to engage loweing mechanism
G91
G1 Z-60

; pause 1 second
G4 P1000

; for pen down go back 30
G91
G1 Z-30

; to go up go forward 30
G91
G1 Z30

M18
