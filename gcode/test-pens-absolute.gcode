M17

; homing thr pen holder cylinder
G77

; in absolute mode go to 89 and call g101 twice to make sure the pen sits correctly at the center
G90
G1 Z89
G101
G101

; in relative mode raise the pen by movng z30
G91
G1 Z30 

; lower the pen using z-30
G1 Z-30

M18
