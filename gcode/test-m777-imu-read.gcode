; ===================================================================
; TEST: M777 IMU Reading (NO DRAWING)
; ===================================================================
; Purpose: Verify we can read IMU pitch angles locally
; Expected: Serial output should show "OK I:<angle>" at each position
; Finding: If we get IMU readings, can display in web UI
; ===================================================================

M17                    ; Enable stepper motors

; IMU works best with pen touching wall
; This test assumes pen is already positioned

G91                    ; Use relative positioning

; Position 1: Starting position
M400                   ; Wait for moves to complete
G4 P1000              ; Wait 1 second for pen to settle
M777                   ; Read IMU (should output: OK I:45.3)
G4 P1000              ; Wait for serial output

; Position 2: Move right 20mm
G1 X20 F1000
M400
G4 P1000
M777                   ; Read IMU at new position
G4 P1000

; Position 3: Move down 20mm
G1 Y20 F1000
M400
G4 P1000
M777                   ; Read IMU at new position
G4 P1000

; Position 4: Move left 20mm
G1 X-20 F1000
M400
G4 P1000
M777                   ; Read IMU at new position
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
; Check ESP32 serial output (or MQTT debug messages):
;
; Expected output (4 readings):
;   OK I:45.3
;   OK I:45.8
;   OK I:44.9
;   OK I:45.2
;
; - If you see "OK I:XX.X" = IMU reading works ✅
; - If you see "IMU unavailable" = IMU hardware error ❌
; - If no output = M777 command not working ❌
;
; IMPLICATION FOR PHASE 2:
; If this works, web UI could:
;   - Show live IMU readings
;   - Help user verify pen is touching wall
;   - Advanced: Implement simplified local calibration
; ===================================================================
