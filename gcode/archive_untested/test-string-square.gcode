; Test square in STRING space (not Cartesian)
; This draws a square by controlling string lengths directly
M17
G91
M18 E
G1 F1000 X20
G1 F1000 Y20
G1 F1000 X-20
G1 F1000 Y-20
M17 E
M18
