; ===================================================================
; TEST: G92 Manual Calibration Command (MOVEMENT ONLY)
; ===================================================================
; Purpose: Verify G92 position reset without drawing
; Expected: Motors should move in cross pattern (audible)
; Finding: Listen for movements centered around origin point
; ===================================================================

M17                    ; Enable stepper motors

; Set current position as origin (0,0)
G92 X0 Y0              ; Tell firmware: "you are now at position (0,0)"

; Use absolute positioning to test G92
G90                    ; Set to absolute positioning mode

; Small delay to settle
G4 P500

; Pen stays UP (no drawing)

; Move in vertical line of cross
G1 Y-20 F1000          ; Move up 20mm from origin
G4 P200

G1 Y20 F1000           ; Move down through origin
G4 P200

G1 Y0 F1000            ; Return to origin
G4 P200

; Move in horizontal line of cross
G1 X20 F1000           ; Move right 20mm from origin
G4 P200

G1 X-20 F1000          ; Move left through origin
G4 P200

G1 X0 F1000            ; Return to origin
G4 P200

; Return to origin
G1 X0 Y0 F1000

; Disable motors
M18

; ===================================================================
; INTERPRETATION:
; - 6 movements (up, down, center, right, left, center) = G92 works ✅
; - Motors return to starting position = Position tracking correct ✅
; - Errors = G92 not supported or position tracking broken ❌
; ===================================================================
