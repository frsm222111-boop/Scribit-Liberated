; ===================================================================
; TEST: M92 Steps-Per-MM Scaling (WITH DRAWING)
; ===================================================================
; Purpose: Verify M92 command can adjust scale without cloud API
; Expected: Should draw 3 horizontal lines of different lengths
; Finding: If lines differ, M92 scaling works for manual calibration
; ===================================================================

M17                    ; Enable stepper motors

; Save original steps_per_mm (from Configuration_Overall.h:335)
; X=30.5577, Y=30.5577 are defaults

G91                    ; Use relative positioning

M18 E                  ; Pen DOWN

; Line 1: Normal scale (30mm at default steps_per_mm)
G1 X30 F1000
G4 P300
M17 E                  ; Pen UP
G1 X-30 Y5 F1000       ; Return left, move down 5mm
G4 P300

; Line 2: 50% larger scale (30mm command = 45mm actual)
M92 X20.372 Y20.372    ; Reduce steps_per_mm by ~33% → larger movements
G4 P300
M18 E                  ; Pen DOWN
G1 X30 F1000
G4 P300
M17 E                  ; Pen UP
G1 X-30 Y5 F1000       ; Return left, move down 5mm
G4 P300

; Line 3: Restore normal scale (30mm)
M92 X30.5577 Y30.5577  ; Restore default
G4 P300
M18 E                  ; Pen DOWN
G1 X30 F1000
G4 P300
M17 E                  ; Pen UP

; Return to absolute mode
G90

; Disable motors
M18

; ===================================================================
; INTERPRETATION:
; - Line 1 = 30mm baseline
; - Line 2 = ~45mm (50% longer) if M92 scaling works ✅
; - Line 3 = 30mm (back to baseline)
;
; If all lines same length = M92 not working or wrong calculation ❌
; If line 2 longer = M92 works for scale adjustment ✅
;
; IMPLICATION FOR PHASE 2:
; If this works, we could let users fine-tune scale:
;   "Is your 100mm line actually 95mm? Adjust scale by 5%"
;   Web UI calculates new M92 values
; ===================================================================
