; ===================================================================
; TEST: M92 Steps-Per-MM Scaling (MOVEMENT ONLY)
; ===================================================================
; Purpose: Verify M92 scale adjustment via motor sounds
; Expected: Second movement should sound longer than first/third
; Finding: Listen to motor duration - 2nd should be ~50% longer
; ===================================================================

M17                    ; Enable stepper motors

G91                    ; Use relative positioning

; Pen stays UP (no drawing)

; Movement 1: Normal scale (30mm at default steps_per_mm)
G1 X30 F1000
G4 P500
G1 X-30 Y5 F1000       ; Return left, move down 5mm
G4 P500

; Movement 2: 50% larger scale (30mm command = 45mm actual)
M92 X20.372 Y20.372    ; Reduce steps_per_mm → larger movements
G4 P300
G1 X30 F1000
G4 P500
G1 X-30 Y5 F1000       ; Return left, move down 5mm
G4 P500

; Movement 3: Restore normal scale (30mm)
M92 X30.5577 Y30.5577  ; Restore default
G4 P300
G1 X30 F1000
G4 P500

; Return to absolute mode
G90

; Disable motors
M18

; ===================================================================
; INTERPRETATION:
; - Movement 1 duration: X seconds (baseline)
; - Movement 2 duration: ~1.5X seconds (50% longer) if M92 works ✅
; - Movement 3 duration: X seconds (back to baseline)
;
; Listen carefully - 2nd movement should be noticeably longer
; If all sound the same = M92 not working ❌
; ===================================================================
