; ===================================================================
; TEST: M777 IMU Reading with Drawing Marks
; ===================================================================
; Purpose: Read IMU and mark positions for visual correlation
; Expected: 4 small dots on wall + serial IMU readings
; Finding: Correlate IMU angles with physical wall positions
; ===================================================================

M17                    ; Enable stepper motors

G91                    ; Use relative positioning

; Position 1: Starting position - draw dot
M18 E                  ; Pen DOWN
G4 P500
M17 E                  ; Pen UP
M400
G4 P1000
M777                   ; Read IMU
G4 P1000

; Move right 20mm to position 2
G1 X20 F1000
M18 E                  ; Pen DOWN - draw dot
G4 P500
M17 E                  ; Pen UP
M400
G4 P1000
M777                   ; Read IMU
G4 P1000

; Move down 20mm to position 3
G1 Y20 F1000
M18 E                  ; Pen DOWN - draw dot
G4 P500
M17 E                  ; Pen UP
M400
G4 P1000
M777                   ; Read IMU
G4 P1000

; Move left 20mm to position 4
G1 X-20 F1000
M18 E                  ; Pen DOWN - draw dot
G4 P500
M17 E                  ; Pen UP
M400
G4 P1000
M777                   ; Read IMU
G4 P1000

; Return to start
G1 Y-20 F1000
M400

; Return to absolute mode
G90

; Disable motors
M18

; ===================================================================
; INTERPRETATION:
; You should see:
; - 4 dots on wall (small pen marks)
; - 4 IMU readings in serial output
;
; Compare IMU angles with dot positions:
; - Same angle at all dots = Wall is flat and vertical ✅
; - Varying angles = Wall has texture or is tilted
; - Pattern in angles = Can use for calibration calculations
;
; Example interpretation:
;   Top dots: I:45.5, I:45.4 → Similar angles (level)
;   Bottom dots: I:44.8, I:44.9 → Lower angles (wall tilts)
;
; IMPLICATION:
; Understanding IMU-to-position relationship helps us potentially
; implement local calibration algorithm in future
; ===================================================================
