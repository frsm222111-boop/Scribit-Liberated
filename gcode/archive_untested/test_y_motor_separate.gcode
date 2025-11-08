; Test Y motor only - separate commands, relative mode
M17
G91
M18 E
G1 F500 Y-50
G4 P3000
G1 F500 Y50
M17 E
M18
