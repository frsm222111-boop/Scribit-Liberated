; ===================================================================
; TEST: G92 Manual Calibration Command (WITH DRAWING)
; ===================================================================
; Purpose: Verify G92 command works for setting current position
;          This is the basis for manual calibration in Phase 2
; Expected: Should draw a centered cross (+ shape)
; Finding: If cross draws correctly, G92 calibration approach works
; ===================================================================

M17                    ; Enable stepper motors

; Set current position as origin (0,0)
; This simulates manual calibration
G92 X0 Y0              ; Tell firmware: "you are now at position (0,0)"

; Use absolute positioning to test G92
G90                    ; Set to absolute positioning mode

; Small delay to settle
G4 P500

M18 E                  ; Pen DOWN

; Draw vertical line of cross (up 20mm, down 40mm, back up 20mm)
G1 Y-20 F1000          ; Move up 20mm from origin
G4 P200

G1 Y20 F1000           ; Move down through origin
G4 P200

G1 Y0 F1000            ; Return to origin
G4 P200

; Draw horizontal line of cross (right 20mm, left 40mm, back right 20mm)
G1 X20 F1000           ; Move right 20mm from origin
G4 P200

G1 X-20 F1000          ; Move left through origin
G4 P200

G1 X0 F1000            ; Return to origin
G4 P200

M17 E                  ; Pen UP

; Return to origin
G1 X0 Y0 F1000

; Disable motors
M18

; ===================================================================
; INTERPRETATION:
; - Clean centered cross = G92 works for manual calibration ✅
; - Cross offset = G92 command not working properly ❌
; - No drawing = Pen down/up commands issue
;
; IMPLICATION FOR PHASE 2:
; If this works, we can implement manual calibration:
;   1. User positions pen at known location
;   2. Web UI sends: G92 X<known_x> Y<known_y>
;   3. User can now draw with correct coordinates
; ===================================================================
